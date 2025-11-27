export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 text-xs mt-8">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-2">
        <div>
          <span className="text-yellow-300 font-semibold">EGPAYDCX</span>{" "}
          <span>– Hybrid Crypto Exchange by</span>{" "}
          <span className="text-gray-200 font-semibold">
            EGPAY Tech Private Limited
          </span>
        </div>
        <div className="flex gap-3">
          <span>Contact: egpay.xyz@gmail.com</span>
          <span>Bhagalpur, Bihar, India</span>
        </div>
      </div>
    </footer>
  );
}