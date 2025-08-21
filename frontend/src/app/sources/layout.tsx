import MainLayout from "@/components/layouts/MainLayout";

export default function SourcesLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <MainLayout>
        {children}
      </MainLayout>
    );
  }
