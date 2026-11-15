import { PublicPlanning } from "@/components/PublicPlanning";

export const metadata = { title: "Planning de l'équipe" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicPlanning token={token} />;
}
