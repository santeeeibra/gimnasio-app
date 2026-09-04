export default function MiTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition min-h-full flex-1">{children}</div>;
}
