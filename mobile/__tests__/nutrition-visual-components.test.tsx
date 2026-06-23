import { render } from "@testing-library/react-native";

import { CircularProgress } from "@/components/CircularProgress";
import { MacroProgressBar } from "@/components/MacroProgressBar";
import { colors } from "@/styles/theme";

describe("nutrition visual components", () => {
  it("exposes calorie progress to assistive technology", async () => {
    const { getByTestId } = await render(
      <CircularProgress consumed={640} progress={0.32} target={2000} />
    );

    expect(getByTestId("calorie-progress").props).toMatchObject({
      accessibilityLabel: "640 de 2000 kilocalorías consumidas",
      accessibilityRole: "progressbar",
      accessibilityValue: {
        max: 2000,
        min: 0,
        now: 640
      }
    });
  });

  it("exposes macro consumption and target without merging their values", async () => {
    const { getByLabelText, getByText } = await render(
      <MacroProgressBar
        color={colors.protein}
        consumed={72}
        label="Proteína"
        target={160}
      />
    );

    expect(getByLabelText("Proteína: 72 de 160 gramos").props.accessibilityValue).toEqual({
      max: 160,
      min: 0,
      now: 72
    });
    expect(getByText("Proteína")).toBeTruthy();
    expect(getByText("/ 160 g")).toBeTruthy();
  });
});
