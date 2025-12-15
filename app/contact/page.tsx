export const metadata = {
  title: "Contact Us | EGPAYDCX",
  description: "Contact details for EGPAYDCX by EGPAY Tech Private Limited",
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-white">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>

      <p className="text-sm text-gray-400 mb-8">
        Last updated on 15-12-2025 06:38:48
      </p>

      <div className="space-y-4 text-gray-200 leading-7">
        <p>You may contact us using the information below:</p>

        <p>
          <b>Merchant Legal Entity Name:</b>
          <br />
          EGPAY TECH PRIVATE LIMITED
        </p>

        <p>
          <b>Registered Address:</b>
          <br />
          Village – Mamlakha,
          <br />
          P.S. – Sabour,
          <br />
          District – Bhagalpur,
          <br />
          Bihar – 813210, India
        </p>

        <p>
          <b>Operational Address:</b>
          <br />
          Village – Mamlakha,
          <br />
          P.S. – Sabour,
          <br />
          District – Bhagalpur,
          <br />
          Bihar – 813210, India
        </p>

        <p>
          <b>Telephone No:</b>
          <br />
          <a
            href="tel:+917545978703"
            className="underline text-gray-300 hover:text-white"
          >
            +91 7545978703
          </a>
        </p>

        <p>
          <b>E-Mail ID:</b>
          <br />
          <a
            href="mailto:egpay.xyz@gmail.com"
            className="underline text-gray-300 hover:text-white"
          >
            egpay.xyz@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}