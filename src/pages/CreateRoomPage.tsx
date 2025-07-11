"use client";

import { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom"; // Changed from next/navigation
import { useApi, useActiveAddress, useConnection } from '@arweave-wallet-kit/react';
import { usePostHog } from 'posthog-js/react';
import { generateRoomKeyPairPem } from "../actions/cryptoClient"; // Adjusted path
import { createRoomWithKmsAction } from '../services/roomActionsClient'; // Adjusted path
import { type CreateRoomInput, type CreateRoomResult } from '../types/types'; // Adjusted path

import RequireLogin from "../components/RequireLogin"; // Adjusted path
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Loader2, AlertCircle, FolderPlus } from "lucide-react";
import { toast } from "sonner";

// Define interface for Othent details if not already global
interface OwnerOthentDetails {
    email: string;
    name?: string;
}

export default function CreateRoomPage() {
  useEffect(() => {
    document.title = "PermaSign | Create Company";
  }, []);

  const navigate = useNavigate(); // Changed from useRouter
  const api = useApi();
  const activeAddress = useActiveAddress();
  const { connected } = useConnection();
  const posthog = usePostHog();

  const [roomName, setRoomName] = useState("");
  const [isRoomNameTouched, setIsRoomNameTouched] = useState(false);
  const [ownerOthentDetails, setOwnerOthentDetails] = useState<OwnerOthentDetails | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isProcessing, startProcessingTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getOthentEmail = async () => {
      if (connected && api?.othent && activeAddress && !ownerOthentDetails && !isFetchingDetails) {
        setIsFetchingDetails(true);
        console.log("Fetching Othent email...");
        try {
          const othentData: any = await api.othent.getUserDetails();
          if (othentData?.email) {
            console.log("Othent details fetched:", othentData);
            setOwnerOthentDetails({ email: othentData.email, name: othentData.name });
          } else {
            console.warn("Othent email not found in fetched data.");
            toast.error("Email Not Found", { description: "Could not retrieve your email from Othent. Ensure you are logged in." });
            setOwnerOthentDetails(null);
          }
        } catch (err: any) {
          console.error("Error Fetching Othent User Details:", err);
          toast.error("Othent Error", { description: `Could not retrieve your details: ${err.message}. Please try reconnecting wallet.` });
          setOwnerOthentDetails(null);
        } finally {
          setIsFetchingDetails(false);
        }
      } else if (!connected || !activeAddress) {
        if (ownerOthentDetails) setOwnerOthentDetails(null);
        if (isFetchingDetails) setIsFetchingDetails(false);
      }
    };
    getOthentEmail();
  }, [api, activeAddress, connected, ownerOthentDetails, isFetchingDetails]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setIsRoomNameTouched(true); // Trigger validation on submit

      if (!connected || !activeAddress || !ownerOthentDetails?.email) {
          setError("Please connect your wallet and ensure email is loaded.");
          toast.error("Not Ready", { description: "Connect wallet and wait for email to load."});
          return;
      }
      if (!roomName.trim()) {
          setError("Please enter a company name.");
          toast.error("Input Required", { description: "Company name cannot be empty."});
          return;
      }

      startProcessingTransition(async () => {
        console.log("Starting room creation process...");
        const toastId = toast.loading("Generating keys and creating room...", { description: "Please wait..." });

        try {
          console.log("Generating RSA key pair for the room...");
          const { publicKeyPem: roomPublicKey, privateKeyPem: roomPrivateKey } = await generateRoomKeyPairPem();
          console.log("Room keys generated successfully client-side.");

          console.log("Calling createRoomWithKmsAction client service (which calls external API)...");
          const actionInput: CreateRoomInput = {
              roomName: roomName.trim(),
              ownerEmail: ownerOthentDetails.email,
              roomPublicKeyPem: roomPublicKey,
              roomPrivateKeyPem: roomPrivateKey,
          };
          const result: CreateRoomResult = await createRoomWithKmsAction(actionInput);

          console.log("Client service action result received:", result);

          if (result.success && result.roomId) {
              posthog?.capture('company_created', {
                  companyId: result.roomId,
                  companyName: roomName.trim()
              });
              toast.success("Success!", {
                  id: toastId,
                  description: `Company '${roomName.trim()}' created! Redirecting...`,
                  duration: 3000,
              });
              console.log(`Redirecting to /companies/${result.roomId}`);
              setRoomName(""); // Reset form on success
              navigate(`/companies/${result.roomId}`); // Changed from router.push
          } else {
              const errorDesc = result.message + (result.error ? ` Details: ${result.error}` : '');
              toast.error("Room Creation Failed", { id: toastId, description: errorDesc, duration: 7000 });
              setError(result.message || "Failed during room creation.");
          }
        } catch (err: any) {
            console.error("Error during client-side room creation process:", err);
            setError(`Client-side error: ${err.message}`);
            toast.error("Client Error", { id: toastId, description: `Failed during key generation or action call: ${err.message}` });
        }
      });
  };

  const isLoading = isFetchingDetails || isProcessing;
  const isFormDisabled = isLoading || !connected || !ownerOthentDetails?.email;
  const showRoomNameError = isRoomNameTouched && !roomName.trim();

  return (
    <RequireLogin>
      <div className="container mx-auto max-w-2xl py-12 px-4 animate-fade-in">
        <div className="text-center mb-10">
          <FolderPlus className="mx-auto h-12 w-12 text-muted-foreground/80" strokeWidth={1.5} />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Set Up Your Company</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            This will create a private, end-to-end encrypted space on PermaSign for your company's high-value agreements.
          </p>
        </div>

        <Card className="w-full shadow-md border-border/60">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                Enter a name for your company. You 
                <span className="italic">
                  {isFetchingDetails ? 'loading...' : " (" + ownerOthentDetails?.email + ") " || 'not available'}
                </span>
                will be registered as the founder of the company.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isFetchingDetails && connected && !ownerOthentDetails?.email && (
                 <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                    <span>Could not load your email from Othent. Please try reconnecting your wallet to continue.</span>
                 </div>
               )}
              
              <div>
                <Label htmlFor="roomName" className="font-semibold">Company Name</Label>
                <Input
                  id="roomName"
                  name="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onBlur={() => setIsRoomNameTouched(true)}
                  placeholder="e.g., Acme Innovations Inc."
                  required
                  disabled={isFormDisabled}
                  aria-describedby="roomNameError"
                  className="mt-2 text-base py-6"
                />
                 {showRoomNameError && <p id="roomNameError" className="text-sm text-destructive pt-2">Company name is required.</p>}
              </div>

            </CardContent>
            <CardFooter className="flex-col items-stretch">
              {error && (
                 <div className="flex items-center gap-2 text-sm text-destructive mb-4">
                    <AlertCircle className="w-4 h-4"/> <span>Error: {error}</span>
                 </div>
              )}
              <Button type="submit" disabled={isFormDisabled || !roomName.trim()} className="w-full" size="lg">
                {isProcessing ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Company... </>)
                 : isFetchingDetails ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Account... </>)
                 : ("Create Company")
                }
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </RequireLogin>
  );
} 