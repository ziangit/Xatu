import { ReportComposer } from "./composer";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team } = await params;
  return <ReportComposer teamId={decodeURIComponent(team)} />;
}
