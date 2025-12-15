export const metadata = {
  title: "Cancellation & Refund Policy | EGPAYDCX",
  description: "Cancellation and Refund Policy for EGPAYDCX services.",
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-white">
      <h1 className="text-3xl font-bold mb-2">
        Cancellation &amp; Refund Policy
      </h1>

      <p className="text-sm text-gray-400 mb-8">
        Last updated on 15-12-2025 06:32:58
      </p>

      <div className="space-y-5 text-gray-200 leading-7">
        <p>
          EGPAY TECH PRIVATE LIMITED believes in providing fair and transparent
          policies to its users. This Cancellation &amp; Refund Policy outlines
          the terms under which cancellations and refunds may be considered for
          services provided through our platform.
        </p>

        <h2 className="text-xl font-semibold mt-6">1. Nature of Services</h2>
        <p>
          EGPAY TECH PRIVATE LIMITED provides digital platform, utility, and
          service facilitation services. Services may include, but are not
          limited to, digital payments, platform usage, and service processing.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. Cancellation Policy</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Cancellation requests will be considered only if raised immediately
            after the payment is made and before the service is initiated.
          </li>
          <li>
            Once a transaction, recharge, or service process has been initiated
            or successfully completed, cancellation requests will not be
            entertained.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">3. Refund Policy</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Refunds shall be applicable only in cases where the service has not
            been delivered or the transaction has failed but the amount has been
            debited.
          </li>
          <li>
            Successfully processed transactions, recharges, or services are
            non-refundable.
          </li>
          <li>
            Refund requests must be raised within 24 hours of the transaction.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">
          4. Refund Processing Time
        </h2>
        <p>
          If a refund is approved, the amount will be credited back to the
          original payment method within 5–7 business days, subject to bank or
          payment gateway processing timelines.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          5. Limitation of Liability
        </h2>
        <p>
          EGPAY TECH PRIVATE LIMITED shall not be responsible for delays or
          failures caused due to third-party service providers, banks, payment
          gateways, or technical issues beyond its control.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          6. Contact for Refund Requests
        </h2>
        <p>
          For cancellation or refund-related queries, users must contact us at:{" "}
          <a
            href="mailto:egpay.xyz@gmail.com"
            className="underline text-gray-300 hover:text-white"
          >
            egpay.xyz@gmail.com
          </a>{" "}
          with transaction details and payment reference number.
        </p>
      </div>
    </div>
  );
}