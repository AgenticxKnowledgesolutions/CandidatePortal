import React, { useState, useEffect } from "react";
import { api, getErrorMessage } from "../services/api";
import logoImg from "../assets/logo/AgenticX-removebg-preview.png";
import { 
  User, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  Upload, 
  FileCode, 
  File, 
  Camera, 
  Info,
  DollarSign
} from "lucide-react";

interface CandidatePayment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  transaction_id?: string;
  payment_date?: string;
}

interface CandidateProfile {
  id: string;
  application_number: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number?: string;
  college_name?: string;
  course_applied?: string;
  program_type?: string;
  performance?: string;
  application_status: string;
  
  // Financials
  standard_course_fee: number;
  scholarship_amount: number;
  special_discount: number;
  corporate_discount: number;
  promo_discount: number;
  booking_amount: number;
  final_payable_amount: number;
  admission_fee_amount: number;
  admission_fee_paid: boolean;
  offer_remarks?: string;
  offer_expiry_date?: string;

  // Documents
  cv_url?: string;
  photo_url?: string;
  aadhaar_url?: string;
  document_status: string;

  // Payments
  payments?: CandidatePayment[];
}

interface DashboardProps {
  onLogout: () => void;
}

// ─── Sub-component: Course Fee Pay Block ──────────────────────────────────────
interface CourseFeePayBlockProps {
  remaining: number;
  coursePaid: number;
  finalPayable: number;
  isPaying: boolean;
  onPay: (paymentType: string, amount: number) => void;
}

const CourseFeePayBlock: React.FC<CourseFeePayBlockProps> = ({
  remaining, coursePaid, finalPayable, isPaying, onPay
}) => {
  const [customAmount, setCustomAmount] = React.useState<string>(String(remaining));
  const [payError, setPayError] = React.useState<string | null>(null);

  const handlePay = () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError("Please enter a valid amount greater than 0.");
      return;
    }
    if (amt > remaining) {
      setPayError(`Amount cannot exceed remaining balance of ₹${remaining}.`);
      return;
    }
    setPayError(null);
    onPay("Installment", amt);
  };

  return (
    <div style={{ border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "8px", padding: "16px", background: "rgba(139, 92, 246, 0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#fff", display: "block" }}>Course Fee Payment</span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Paid ₹{coursePaid} of ₹{finalPayable} — Remaining ₹{remaining}
          </span>
        </div>
        <span style={{ fontSize: "18px", fontWeight: "800", color: "#f59e0b" }}>₹{remaining}</span>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{
            position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
            color: "var(--text-muted)", fontSize: "14px", pointerEvents: "none"
          }}>₹</span>
          <input
            type="number"
            min="1"
            max={remaining}
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setPayError(null); }}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px", color: "#fff", padding: "9px 10px 9px 26px",
              fontSize: "14px", fontWeight: "600", outline: "none"
            }}
          />
        </div>
        <button
          onClick={() => setCustomAmount(String(remaining))}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "6px", color: "var(--text-muted)", padding: "9px 12px",
            fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap"
          }}
        >Pay Full</button>
      </div>

      {payError && (
        <p style={{ fontSize: "12px", color: "var(--color-danger)", marginBottom: "8px" }}>{payError}</p>
      )}

      <button
        onClick={handlePay}
        disabled={isPaying}
        className="btn-primary"
        style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" }}
      >
        {isPaying ? "Initializing Gateway..." : `Pay ₹${customAmount || 0} Now`}
      </button>
      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
        You can pay in installments. Enter any amount up to ₹{remaining}.
      </p>
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "fees" | "docs">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Document uploading state
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [mockPaymentOrder, setMockPaymentOrder] = useState<any | null>(null);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/candidates/portal/profile");
      setProfile(response.data);
    } catch (err: any) {
      setError("Failed to load profile. Please log in again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Stepper steps configuration
  const steps = [
    { label: "Applied", status: "Submitted" },
    { label: "Offer Issued", status: "Offer Sent" },
    { label: "Fee Verification", status: "Admission Fee Pending" },
    { label: "Enrolled", status: "Enrolled" },
    { label: "Completed", status: "Completed" }
  ];

  const getStepIndex = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return 4;
    if (s === "enrolled" || s === "admission fee paid") return 3;
    if (s === "admission fee pending") return 2;
    if (s === "offer sent") return 1;
    return 0; // Submitted
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: "cv" | "photo" | "aadhaar") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docType);
    setUploadSuccess(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/candidates/portal/upload-document?doc_type=${docType}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setUploadSuccess(`Successfully uploaded ${docType.toUpperCase()}`);
      await fetchProfile(); // reload
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingDoc(null);
    }
  };

  // Payment triggers
  const handleInitiatePayment = async (paymentType: string, amount: number) => {
    setIsPaying(true);
    setPaymentError(null);

    try {
      const response = await api.post("/candidates/portal/payments/create-order", {
        amount,
        payment_type: paymentType
      });

      const orderData = response.data;

      if (orderData.sandbox) {
        // Show simulated Sandbox/Mock Payment screen
        setMockPaymentOrder({
          order_id: orderData.order_id,
          amount: orderData.amount,
          payment_type: paymentType
        });
      } else {
        // Load Razorpay Checkout dynamically
        const loadRazorpay = () => {
          return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const loaded = await loadRazorpay();
        if (!loaded) {
          throw new Error("Failed to load payment gateway checkout client.");
        }

        const options = {
          key: orderData.key,
          amount: orderData.amount * 100,
          currency: orderData.currency,
          name: "AgenticX Knowledge Solutions",
          description: `${paymentType} - Portal Checkout`,
          order_id: orderData.order_id,
          handler: async (verifyRes: any) => {
            try {
              setIsPaying(true);
              await api.post("/candidates/portal/payments/verify", {
                razorpay_order_id: verifyRes.razorpay_order_id,
                razorpay_payment_id: verifyRes.razorpay_payment_id,
                razorpay_signature: verifyRes.razorpay_signature,
                payment_type: paymentType,
                amount
              });
              await fetchProfile();
            } catch (vErr: any) {
              setPaymentError("Payment verification failed. Please contact support.");
            } finally {
              setIsPaying(false);
            }
          },
          prefill: {
            name: profile?.full_name,
            email: profile?.email,
            contact: profile?.phone
          },
          theme: {
            color: "#0052fe"
          }
        };

        const rzp = (window as any).Razorpay ? new (window as any).Razorpay(options) : null;
        if (rzp) {
          rzp.open();
        } else {
          throw new Error("Razorpay instance unavailable");
        }
        setIsPaying(false);
      }
    } catch (err: any) {
      setPaymentError(getErrorMessage(err));
      setIsPaying(false);
    }
  };

  const handleVerifyMockPayment = async (success: boolean) => {
    if (!mockPaymentOrder) return;
    setIsPaying(true);
    setPaymentError(null);

    const { order_id, amount, payment_type } = mockPaymentOrder;

    try {
      if (success) {
        await api.post("/candidates/portal/payments/verify", {
          razorpay_order_id: order_id,
          razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
          razorpay_signature: "signature_mock_value",
          payment_type: payment_type,
          amount: amount
        });
        await fetchProfile();
      } else {
        setPaymentError("Simulated payment cancelled by user.");
      }
    } catch (err: any) {
      setPaymentError("Failed to record sandbox payment.");
    } finally {
      setMockPaymentOrder(null);
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>Loading dashboard profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--color-danger)" }}>Error loading dashboard profile.</p>
        <button onClick={onLogout} className="btn-primary" style={{ marginTop: "16px" }}>Logout</button>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(profile.application_status);

  return (
    <div className="dashboard-layout">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <img src={logoImg} alt="AgenticX Logo" style={{ height: "36px", display: "block" }} />
        </div>
        <div className="user-menu">
          <span className="user-email">{profile.email}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        
        {/* Welcome Block */}
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(0, 82, 254, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>
                Welcome, {profile.full_name}!
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                Application No: <strong style={{ color: "#fff" }}>{profile.application_number}</strong> | Status: <span className={`badge ${profile.application_status.toLowerCase() === "completed" ? "badge-success" : "badge-info"}`}>{profile.application_status}</span>
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <span className={`badge ${profile.document_status === "Verified" ? "badge-success" : profile.document_status === "Rejected" ? "badge-danger" : "badge-warning"}`}>
                Documents: {profile.document_status}
              </span>
              <span className={`badge ${profile.admission_fee_paid ? "badge-success" : "badge-warning"}`}>
                Admission Fee: {profile.admission_fee_paid ? "Paid" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <User size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Application Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === "fees" ? "active" : ""}`}
            onClick={() => setActiveTab("fees")}
          >
            <CreditCard size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Fee Structure & Payments
          </button>
          <button 
            className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            <FileText size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Documents Manager
          </button>
        </nav>

        {/* Feedback Alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {uploadSuccess && <div className="alert alert-success">{uploadSuccess}</div>}
        {paymentError && <div className="alert alert-error">{paymentError}</div>}

        {/* Sandbox Mock Checkout Overlay */}
        {mockPaymentOrder && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}>
            <div className="card" style={{ maxWidth: "400px", width: "100%", border: "2px solid var(--color-primary)", padding: "30px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <DollarSign size={40} style={{ color: "var(--color-primary)", margin: "0 auto 10px" }} />
                <h3 style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>Sandbox Payment Simulation</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                  Bypassing live checkout gateway (mock credentials)
                </p>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", fontSize: "14px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Transaction Type:</span>
                  <strong>{mockPaymentOrder.payment_type}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Amount Due:</span>
                  <strong style={{ color: "var(--color-success)" }}>₹{mockPaymentOrder.amount}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => handleVerifyMockPayment(true)}
                  disabled={isPaying}
                  className="btn-primary" 
                  style={{ flex: 1, background: "var(--color-success)" }}
                >
                  {isPaying ? "Processing..." : "Simulate Success"}
                </button>
                <button 
                  onClick={() => handleVerifyMockPayment(false)}
                  disabled={isPaying}
                  className="btn-primary" 
                  style={{ flex: 1, background: "var(--color-danger)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Panels */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Stepper Status tracker */}
            <div className="card">
              <h3 className="card-title">Admission Process Timeline</h3>
              <div className="stepper">
                {steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`step ${idx < currentStepIdx ? "completed" : idx === currentStepIdx ? "active" : ""}`}
                  >
                    <div className="step-bubble">
                      {idx < currentStepIdx ? "✓" : idx + 1}
                    </div>
                    <span className="step-label">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Grid info */}
            <div className="grid-2">
              
              <div className="card">
                <h3 className="card-title">Registration Details</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                  <div className="flex-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Program Registered:</span>
                    <strong style={{ color: "#fff" }}>{profile.course_applied || "N/A"}</strong>
                  </div>
                  <div className="flex-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Program Type:</span>
                    <strong style={{ color: "#fff" }}>{profile.program_type || "N/A"}</strong>
                  </div>
                  <div className="flex-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Contact Number:</span>
                    <strong style={{ color: "#fff" }}>{profile.phone}</strong>
                  </div>
                  <div className="flex-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--text-muted)" }}>WhatsApp:</span>
                    <strong style={{ color: "#fff" }}>{profile.whatsapp_number || "N/A"}</strong>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: "var(--text-muted)" }}>College:</span>
                    <strong style={{ color: "#fff", maxWidth: "200px", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profile.college_name || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Admission Steps Needed</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ color: profile.admission_fee_paid ? "var(--color-success)" : "var(--color-warning)", marginTop: "2px" }}>
                      {profile.admission_fee_paid ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Admission Registration Fee</span>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {profile.admission_fee_paid ? "Completed & verified" : `Please pay the admission fee of ₹${profile.admission_fee_amount} to secure registration.`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px" }}>
                    <div style={{ color: profile.document_status === "Verified" ? "var(--color-success)" : "var(--color-warning)", marginTop: "2px" }}>
                      {profile.document_status === "Verified" ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Document Submission</span>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Current Status: {profile.document_status}. Please upload CV, Photo & Aadhaar in the Documents tab.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === "fees" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Fee structure card */}
            <div className="grid-2">
              
              <div className="card">
                <h3 className="card-title">Personalized Fee Structure</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                  <div className="flex-between">
                    <span style={{ color: "var(--text-muted)" }}>Standard Program Fee:</span>
                    <strong style={{ color: "#fff" }}>₹{profile.standard_course_fee}</strong>
                  </div>
                  
                  {(profile.scholarship_amount > 0) && (
                    <div className="flex-between" style={{ color: "var(--color-success)" }}>
                      <span>Scholarship Award:</span>
                      <strong>-₹{profile.scholarship_amount}</strong>
                    </div>
                  )}

                  {((profile.special_discount || 0) + (profile.corporate_discount || 0) + (profile.promo_discount || 0) > 0) && (
                    <div className="flex-between" style={{ color: "var(--color-success)" }}>
                      <span>Additional Discounts:</span>
                      <strong>-₹{(profile.special_discount || 0) + (profile.corporate_discount || 0) + (profile.promo_discount || 0)}</strong>
                    </div>
                  )}

                  <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />
                  
                  <div className="flex-between" style={{ fontSize: "16px", fontWeight: "700" }}>
                    <span style={{ color: "#fff" }}>Net Payable Amount:</span>
                    <span style={{ color: "var(--color-success)" }}>₹{profile.final_payable_amount}</span>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

                  <div className="flex-between">
                    <span style={{ color: "var(--text-muted)" }}>Admission Fee:</span>
                    <strong style={{ color: profile.admission_fee_paid ? "var(--color-success)" : "var(--color-warning)" }}>
                      ₹{profile.admission_fee_amount} ({profile.admission_fee_paid ? "Paid" : "Unpaid"})
                    </strong>
                  </div>

                  {/* Course fee paid / remaining — only meaningful if there's a payable amount */}
                  {(profile.final_payable_amount > 0) && (() => {
                    const coursePaid = (profile.payments || [])
                      .filter(p => p.status === "Paid" && p.payment_type !== "Admission Fee")
                      .reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, profile.final_payable_amount - coursePaid);
                    return (
                      <>
                        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />
                        <div className="flex-between">
                          <span style={{ color: "var(--text-muted)" }}>Course Fee Paid:</span>
                          <strong style={{ color: "var(--color-success)" }}>₹{coursePaid}</strong>
                        </div>
                        <div className="flex-between">
                          <span style={{ color: "var(--text-muted)" }}>Remaining Balance:</span>
                          <strong style={{ color: remaining > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                            ₹{remaining}{remaining === 0 ? " ✓ Cleared" : ""}
                          </strong>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                            <span>Course Fee Progress</span>
                            <span>{Math.min(100, Math.round((coursePaid / profile.final_payable_amount) * 100))}%</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "100px", height: "6px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              borderRadius: "100px",
                              width: `${Math.min(100, (coursePaid / profile.final_payable_amount) * 100)}%`,
                              background: remaining === 0 ? "var(--color-success)" : "linear-gradient(90deg, var(--color-primary), #8b5cf6)",
                              transition: "width 0.5s ease"
                            }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {profile.offer_remarks && (
                  <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "var(--color-primary)", marginBottom: "4px" }}>
                      <Info size={14} />
                      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Admission Team Note</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{profile.offer_remarks}</p>
                  </div>
                )}

                {profile.offer_expiry_date && (
                  <p style={{ fontSize: "11px", color: "var(--color-danger)", marginTop: "12px", fontWeight: "600" }}>
                    * This fee structure offer is valid until {new Date(profile.offer_expiry_date).toLocaleDateString()}.
                  </p>
                )}
              </div>

              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 className="card-title">Payment Checkout</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>
                    Make secure online payments. Admission fee secures your slot; course fee can be paid in installments.
                  </p>

                  {/* --- Admission Fee Section --- */}
                  {!profile.admission_fee_paid ? (
                    <>
                      <div style={{ background: "rgba(0, 82, 254, 0.04)", border: "1px dashed rgba(0, 82, 254, 0.2)", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                        <div className="flex-between" style={{ marginBottom: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Registration & Admission Fee</span>
                          <strong style={{ color: "var(--color-success)", fontSize: "16px" }}>₹{profile.admission_fee_amount}</strong>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Pay the admission fee to register and lock your scholarship slot.
                        </p>
                      </div>
                      <button
                        onClick={() => handleInitiatePayment("Admission Fee", profile.admission_fee_amount)}
                        disabled={isPaying}
                        className="btn-primary"
                        style={{ width: "100%", background: "linear-gradient(135deg, var(--color-primary) 0%, #1d4ed8 100%)", marginBottom: "12px" }}
                      >
                        {isPaying ? "Initializing Gateway..." : `Pay Admission Fee (₹${profile.admission_fee_amount})`}
                      </button>
                    </>
                  ) : (
                    <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "14px", marginBottom: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                      <CheckCircle size={18} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: "#fff", fontSize: "14px", display: "block" }}>Admission Fee Cleared</strong>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Your enrollment registration is active.</span>
                      </div>
                    </div>
                  )}

                  {/* --- Course Fee Remaining Section --- */}
                  {profile.admission_fee_paid && profile.final_payable_amount > 0 && (() => {
                    const coursePaid = (profile.payments || [])
                      .filter(p => p.status === "Paid" && p.payment_type !== "Admission Fee")
                      .reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, profile.final_payable_amount - coursePaid);

                    if (remaining <= 0) {
                      return (
                        <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "14px", display: "flex", gap: "10px", alignItems: "center" }}>
                          <CheckCircle size={18} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: "#fff", fontSize: "14px", display: "block" }}>Course Fee Fully Paid 🎉</strong>
                            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>All course fee payments complete. Thank you!</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <CourseFeePayBlock
                        remaining={remaining}
                        coursePaid={coursePaid}
                        finalPayable={profile.final_payable_amount}
                        isPaying={isPaying}
                        onPay={handleInitiatePayment}
                      />
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Payment logs table */}
            <div className="card">
              <h3 className="card-title">Payment History Receipts</h3>
              
              {(!profile.payments || profile.payments.length === 0) ? (
                <div style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                  No payment logs found on your account.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Transaction ID</th>
                        <th>Receipt Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td style={{ fontWeight: "600" }}>{payment.payment_type}</td>
                          <td>{payment.payment_method}</td>
                          <td style={{ color: "var(--color-success)", fontWeight: "700" }}>₹{payment.amount}</td>
                          <td>
                            <span className={`badge ${payment.status === "Paid" ? "badge-success" : "badge-warning"}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                            {payment.transaction_id || "N/A"}
                          </td>
                          <td>
                            {payment.payment_date ? new Date(payment.payment_date).toLocaleString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === "docs" && (
          <div className="card">
            <h3 className="card-title">Self-Service Document Submission</h3>
            <p className="card-subtitle">
              Upload standard file formats (PDF, JPG, PNG). Max file size is 20MB for resumes and 5MB for photos.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* CV Row */}
              <div className="doc-row">
                <div className="doc-info">
                  <div style={{ background: "rgba(0, 82, 254, 0.1)", padding: "10px", borderRadius: "8px", color: "var(--color-primary)" }}>
                    <FileCode size={20} />
                  </div>
                  <div>
                    <span className="doc-name">Resume / CV</span>
                    <div className="doc-status">
                      {profile.cv_url ? (
                        <a href={profile.cv_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: "600" }}>
                          View Uploaded CV
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-danger)" }}>Missing Document</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 12px", cursor: "pointer" }}>
                    <Upload size={14} />
                    {uploadingDoc === "cv" ? "Uploading..." : profile.cv_url ? "Replace CV" : "Upload CV"}
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }} 
                      disabled={uploadingDoc !== null}
                      onChange={(e) => handleDocumentUpload(e, "cv")} 
                    />
                  </label>
                </div>
              </div>

              {/* Photo Row */}
              <div className="doc-row">
                <div className="doc-info">
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px", borderRadius: "8px", color: "var(--color-success)" }}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <span className="doc-name">Passport Photo</span>
                    <div className="doc-status">
                      {profile.photo_url ? (
                        <a href={profile.photo_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: "600" }}>
                          View Uploaded Photo
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-danger)" }}>Missing Document</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 12px", cursor: "pointer" }}>
                    <Upload size={14} />
                    {uploadingDoc === "photo" ? "Uploading..." : profile.photo_url ? "Replace Photo" : "Upload Photo"}
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      style={{ display: "none" }} 
                      disabled={uploadingDoc !== null}
                      onChange={(e) => handleDocumentUpload(e, "photo")} 
                    />
                  </label>
                </div>
              </div>

              {/* Aadhaar Row */}
              <div className="doc-row">
                <div className="doc-info">
                  <div style={{ background: "rgba(139, 92, 246, 0.1)", padding: "10px", borderRadius: "8px", color: "#8b5cf6" }}>
                    <File size={20} />
                  </div>
                  <div>
                    <span className="doc-name">Aadhaar Card (PDF / Image)</span>
                    <div className="doc-status">
                      {profile.aadhaar_url ? (
                        <a href={profile.aadhaar_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: "600" }}>
                          View Uploaded Aadhaar
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-danger)" }}>Missing Document</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 12px", cursor: "pointer" }}>
                    <Upload size={14} />
                    {uploadingDoc === "aadhaar" ? "Uploading..." : profile.aadhaar_url ? "Replace Aadhaar" : "Upload Aadhaar"}
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }} 
                      disabled={uploadingDoc !== null}
                      onChange={(e) => handleDocumentUpload(e, "aadhaar")} 
                    />
                  </label>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};
