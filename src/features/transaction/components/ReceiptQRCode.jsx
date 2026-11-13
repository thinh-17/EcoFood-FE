export function ReceiptQRCode({ qr, size = 288 }) {
  return <svg className="receipt-qr" role="img" aria-label="QR Code truy cập Digital Receipt"
    width={size} height={size} viewBox={`0 0 ${qr.viewSize} ${qr.viewSize}`} shapeRendering="crispEdges">
    <rect width={qr.viewSize} height={qr.viewSize} fill="#fff" />
    <path d={qr.path} fill="#000" />
  </svg>;
}
