export default function PanelTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition w-full flex-1">{children}</div>;
}
