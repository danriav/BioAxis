import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { BiometricLineChart } from "@/components/BiometricLineChart";
import { getEmptyMetricMessage } from "@/features/dashboard/biometricHistoryViewModel";

describe("biometric chart components", () => {
  it("renders the empty chart state for a metric without records", async () => {
    const { getByTestId, getByText } = await render(
      <>
        <BiometricLineChart color="#33d6c5" points={[]} unit="cm" />
        <Text>{getEmptyMetricMessage("pantorrilla")}</Text>
      </>
    );

    expect(getByTestId("biometric-chart-empty")).toBeTruthy();
    expect(getByText("Aún no hay registros de pantorrilla.")).toBeTruthy();
  });
});
