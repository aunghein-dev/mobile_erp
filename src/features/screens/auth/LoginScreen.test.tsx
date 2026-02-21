import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import Toast from "react-native-toast-message";
import LoginScreen from "./LoginScreen";
import { useLogin } from "@/features/hooks/auth/useAuth";
import { useRememberLoginStore } from "@/shared/store/useRememberLoginStore";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

jest.mock("@/features/hooks/auth/useAuth", () => ({
  useLogin: jest.fn(),
}));

jest.mock("@/features/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

type LoginHookState = {
  mutateAsync: jest.Mock<Promise<unknown>, [{ username: string; password: string }]>;
  isPending: boolean;
};

function mockLoginState(state: LoginHookState) {
  (useLogin as jest.Mock).mockReturnValue(state);
}

describe("LoginScreen", () => {
  beforeEach(() => {
    useRememberLoginStore.getState().clearRememberLogin();
  });

  test("submits credentials when form is valid", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ business: 103 });
    mockLoginState({ mutateAsync, isPending: false });

    const screen = renderWithProviders(<LoginScreen />);
    const username = screen.getByPlaceholderText("owner@business.com");
    const password = screen.getByPlaceholderText("Enter your password");
    const button = screen.getByRole("button", { name: /sign in/i });

    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(username, "owner@test.com");
    fireEvent.changeText(password, "password123");
    fireEvent.press(button);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        username: "owner@test.com",
        password: "password123",
      });
    });
  });

  test("stores remembered login when enabled", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ business: 103 });
    mockLoginState({ mutateAsync, isPending: false });

    const screen = renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByText("Remember me on this device"));
    fireEvent.changeText(screen.getByPlaceholderText("owner@business.com"), "remembered-user");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "remembered-pass");
    fireEvent.press(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(useRememberLoginStore.getState().remember).toBe(true);
    });

    expect(useRememberLoginStore.getState().username).toBe("remembered-user");
    expect(useRememberLoginStore.getState().password).toBe("remembered-pass");
  });

  test("shows error toast on failed login", async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error("Invalid credentials"));
    mockLoginState({ mutateAsync, isPending: false });

    const screen = renderWithProviders(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("owner@business.com"), "owner@test.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrong-pass");
    fireEvent.press(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          text2: "Invalid credentials",
        })
      );
    });
  });
});
