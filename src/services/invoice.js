const PDFDocument = require("pdfkit");

const fmt = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");

// Builds a clean, gallery-appropriate PDF invoice and resolves to a Buffer,
// ready to attach directly to the confirmation email. No temp files on disk.
function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("THE 1111 PROJECT", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Invoice", { align: "left" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(11);
    doc.text(`Invoice #: ${order.id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-GB")}`);
    doc.text(`Billed to: ${order.shippingName}`);
    doc.text(`Email: ${order.shippingEmail}`);
    doc.text(`Delivery address: ${order.shippingStreet}, ${order.shippingCity}, ${order.shippingCountry} ${order.shippingPostalCode}`);
    doc.text(`Phone: ${order.shippingPhone}`);
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold");
    doc.text("Item", 50, doc.y, { continued: true, width: 260 });
    doc.text("Qty", 320, doc.y, { continued: true, width: 60 });
    doc.text("Price", 390, doc.y, { continued: true, width: 80 });
    doc.text("Subtotal", 470, doc.y);
    doc.font("Helvetica");
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.5);

    order.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.product.name, 50, y, { width: 260 });
      doc.text(String(item.qty), 320, y, { width: 60 });
      doc.text(fmt(item.price), 390, y, { width: 80 });
      doc.text(fmt(item.price * item.qty), 470, y);
      doc.moveDown(0.8);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text(`Total Paid: ${fmt(order.subtotal)}`, { align: "right" });
    doc.font("Helvetica").moveDown(2);
    doc.fontSize(9).fillColor("#888").text(
      "Thank you for collecting with The 1111 Project. Each piece is limited, numbered, and augmented-reality enabled.",
      { align: "left" }
    );

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
