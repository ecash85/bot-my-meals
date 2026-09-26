import { JoinLanding } from "@/components/join-landing";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JoinLanding token={token} />;
}
