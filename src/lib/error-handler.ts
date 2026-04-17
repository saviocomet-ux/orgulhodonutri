import { toast } from "sonner";
import { PostgrestError } from "@supabase/supabase-js";

export const handleError = (error: any, context?: string) => {
  console.error(`Error ${context ? `in ${context}` : ""}:`, error);

  let message = "Ocorreu um erro inesperado.";

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if ("message" in error) {
    message = (error as any).message;
  }

  // Supabase specific errors
  if (error && (error as PostgrestError).code) {
    const pgError = error as PostgrestError;
    console.error("Supabase Error Code:", pgError.code);
    
    // Customize messages for common PG error codes
    if (pgError.code === "23505") {
      message = "Este registro já existe.";
    } else if (pgError.code === "42703") {
      message = "Erro de configuração no banco de dados.";
    }
  }

  toast.error(message, {
    description: context,
  });

  return message;
};
