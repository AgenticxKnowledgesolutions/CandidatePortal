import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import logoImg from "../assets/logo/AgenticX-removebg-preview.png";

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/candidate/otp/request", { email });
      setStep("otp");
      setResendCooldown(30); // 30 seconds cooldown
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send OTP. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/candidate/otp/verify", {
        email,
        otp_code: otp,
      });
      localStorage.setItem("candidate_token", response.data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src={logoImg} alt="AgenticX Logo" style={{ height: "48px", marginBottom: "12px" }} />
          <p>Candidate Admission Portal</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === "email" ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label>Registered Email Address</label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary"
              style={{ width: "100%", marginTop: "8px" }}
            >
              {loading ? "Sending OTP..." : "Get OTP Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                className="form-control"
                placeholder="0 0 0 0 0 0"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                style={{
                  textAlign: "center",
                  fontSize: "20px",
                  letterSpacing: "4px",
                }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                We sent a validation code to {email}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-primary"
              style={{ width: "100%", marginTop: "8px" }}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Resend code in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                  setOtp("");
                }}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
