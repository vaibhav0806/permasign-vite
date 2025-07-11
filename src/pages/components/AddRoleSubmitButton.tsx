"use client";
import { useFormStatus } from "react-dom";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";

export default function AddRoleSubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                </>
            ) : (
                "Add Role"
            )}
        </Button>
    );
}