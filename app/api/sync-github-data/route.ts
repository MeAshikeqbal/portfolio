import { type NextRequest, NextResponse } from "next/server";
import { fetchGitHubData, fetchAllRepositories } from "@/lib/fetch-github-data";
import { client } from "@/sanity/lib/client";
import type { Project } from "@/lib/api";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  // Allow manual triggering without authorization in development
  if (
    process.env.NODE_ENV !== "development" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all projects from Sanity (including drafts)
    const projects: Project[] = await client.fetch(`
      *[_type == "project" && defined(github)] {
        _id,
        title,
        github
      }
    `);

    const results = [];

    // Update existing projects
    for (const project of projects) {
      try {
        const githubData = await fetchGitHubData(project.github);

        if (githubData) {
          await client.patch(project._id).set({ githubData }).commit();

          results.push(`Updated GitHub data for project: ${project.title}`);
        } else {
          results.push(
            `Failed to fetch GitHub data for project: ${project.title}`
          );
        }
      } catch (error) {
        console.error(`Error processing project ${project.title}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push(
          `Error processing project ${project.title}: ${errorMessage}`
        );
      }
    }

    // Fetch all repositories from GitHub
    const allRepos = await fetchAllRepositories();

    // Create draft projects for new repositories
    for (const repo of allRepos) {
      const existingProject = projects.find((p) => p.github === repo.url);
      if (!existingProject) {
        try {
          await client.create({
            _id: `drafts.project-${repo.name.toLowerCase().replace(/\s+/g, "-")}`,
            _type: "project",
            title: repo.name,
            description: repo.description,
            github: repo.url,
            url: repo.homepage || "",
            githubData: {
              stars: repo.stars,
              commits: 0, // We don't have this information from the list API
              license: "Not specified", // We don't have this information from the list API
            },
            // Add any other fields you want to include
          });

          results.push(
            `Created draft project for new repository: ${repo.name}`
          );
        } catch (error) {
          console.error(
            `Error creating draft project for ${repo.name}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return NextResponse.json(
            { message: "Error creating draft project", error: errorMessage },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      message: "GitHub data sync completed",
      results,
    });
  } catch (error) {
    console.error("Error syncing GitHub data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Error syncing GitHub data", error: errorMessage },
      { status: 500 }
    );
  }
}
