import MainLayout from "@/components/layouts/MainLayout";

export default function StoriesLayout({
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
