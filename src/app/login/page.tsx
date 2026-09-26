import { LoginHome } from "@/components/login-home";
import { loginCallbackFailedMessage } from "@/lib/login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  return <LoginHome callbackError={loginCallbackFailedMessage(params.error)} />;
}
