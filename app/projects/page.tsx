import type { Metadata } from "next";
import { projects, site } from "@/data/portfolio";
import AllProjects from "@/sections/AllProjects";
import Footer from "@/sections/Footer";

export const metadata: Metadata = {
  title: `All projects — ${site.name}`,
  description: `Every project by ${site.name}: ${projects.items
    .map((project) => project.title)
    .join(", ")}.`,
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <AllProjects />
      <Footer />
    </>
  );
}
