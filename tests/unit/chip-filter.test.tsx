import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChipFilter } from "@/components/dashboard/chip-filter"

const options = ["Go", "Next.js", "Redis", "Bash", "Docker"]

function chips() {
  return screen.getAllByRole("button", { pressed: undefined }).map((b) => b.textContent)
}

describe("ChipFilter", () => {
  it("shows every option when there's no limit", () => {
    render(<ChipFilter label="stack" options={options} value="" onChange={() => {}} />)
    expect(chips()).toEqual(["all", ...options])
  })

  it("collapses past the limit behind a +N more toggle that expands and folds back", () => {
    render(<ChipFilter label="stack" options={options} value="" onChange={() => {}} limit={2} />)
    expect(chips()).toEqual(["all", "Go", "Next.js", "+3 more"])

    fireEvent.click(screen.getByRole("button", { name: "+3 more" }))
    expect(chips()).toEqual(["all", ...options, "show fewer"])

    fireEvent.click(screen.getByRole("button", { name: "show fewer" }))
    expect(chips()).toEqual(["all", "Go", "Next.js", "+3 more"])
  })

  it("keeps a selected option visible while collapsed", () => {
    render(
      <ChipFilter label="stack" options={options} value="Bash" onChange={() => {}} limit={2} />,
    )
    expect(chips()).toEqual(["all", "Go", "Next.js", "Bash", "+2 more"])
    expect(screen.getByRole("button", { name: "Bash" })).toHaveAttribute("aria-pressed", "true")
  })

  it("doesn't collapse to hide a single option", () => {
    render(<ChipFilter label="stack" options={options} value="" onChange={() => {}} limit={4} />)
    expect(chips()).toEqual(["all", ...options])
  })

  it("reports the clicked option", () => {
    const onChange = vi.fn()
    render(<ChipFilter label="stack" options={options} value="" onChange={onChange} limit={2} />)
    fireEvent.click(screen.getByRole("button", { name: "Next.js" }))
    expect(onChange).toHaveBeenCalledWith("Next.js")
  })
})
