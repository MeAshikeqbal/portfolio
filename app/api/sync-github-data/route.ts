import { type NextRequest, NextResponse } from "next/server";
import { fetchGitHubData } from "@/lib/fetch-github-data";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all projects from Sanity
    const projects = await client.fetch(
      '*[_type == "project" && defined(github)]'
    );

    for (const project of projects) {
      const githubData = await fetchGitHubData(project.github);

      if (githubData) {
        // Update the project in Sanity with the new GitHub data
        await client
          .patch(project._id)
          .set({
            githubData: {
              stars: githubData.stars,
              commits: githubData.commits,
              license: githubData.license,
            },
          })
          .commit();

        console.log(`Updated GitHub data for project: ${project.title}`);
      }
    }

    return NextResponse.json({
      message: "GitHub data sync completed successfully",
    });
  } catch (error) {
    console.error("Error syncing GitHub data:", error);
    return NextResponse.json(
      { message: "Error syncing GitHub data" },
      { status: 500 }
    );
  }
}
