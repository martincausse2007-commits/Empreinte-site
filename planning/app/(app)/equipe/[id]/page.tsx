import { EmployeePage } from "@/components/team/EmployeePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeePage id={id} />;
}
