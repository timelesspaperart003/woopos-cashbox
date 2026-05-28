
import { CartItem, Customer, OrderSummary, Order, PaymentMethod } from '../../types';

export const printOrder = (
  orderData: {
    id?: string;
    date: string;
    items: CartItem[];
    customer: Customer | null;
    summary: OrderSummary;
    employeeName?: string;
    paymentMethod?: PaymentMethod;
  },
  storeName: string = "Pos store",
  options: { includeThumbnails?: boolean } = {}
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("請允許開啟彈出視窗以進行列印");
    return;
  }

  const { id, date, items, customer, summary, employeeName, paymentMethod } = orderData;
  const { includeThumbnails = false } = options;

  const paymentMethodLabel = paymentMethod === 'cash_drawer' ? '現金(錢箱)' : 
                         paymentMethod === 'cash' ? '一般現金' : 
                         paymentMethod === 'transfer' ? '銀行轉帳' : '其他';

  const html = `
    <html>
      <head>
        <title>列印單據 - ${id || '新訂單'}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            width: 80mm; 
            padding: 5mm; 
            box-sizing: border-box; 
            font-size: 12px;
            line-height: 1.4;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 5mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
          .store-name { font-size: 18px; font-bold: bold; margin-bottom: 1mm; }
          .order-info { margin-bottom: 4mm; font-size: 10px; }
          .section-title { font-weight: bold; margin-bottom: 1mm; border-bottom: 1px solid #eee; }
          .item-container { display: flex; gap: 2mm; margin-bottom: 2mm; align-items: flex-start; }
          .item-img { width: 12mm; h: 12mm; object-fit: cover; border-radius: 1mm; border: 1px solid #eee; }
          .item-info { flex: 1; }
          .item-header { display: flex; justify-content: space-between; }
          .item-details { font-size: 10px; color: #666; }
          .totals { margin-top: 4mm; border-top: 1px dashed #000; pt: 2mm; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 0.5mm; }
          .grand-total { font-size: 16px; font-weight: bold; margin-top: 2mm; border-top: 1px solid #000; padding-top: 1mm; }
          .footer { text-align: center; margin-top: 8mm; font-size: 10px; font-style: italic; }
          .customer-box { background: #f9f9f9; padding: 2mm; margin-bottom: 4mm; border: 1px solid #eee; }
          @media print {
            body { width: 100%; border: none; }
            .item-img { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          <div>銷售結帳單</div>
        </div>

        <div class="order-info">
          <div>單號: ${id || '尚未建立'}</div>
          <div>時間: ${new Date(date).toLocaleString()}</div>
          ${paymentMethod ? `<div>付款方式: ${paymentMethodLabel}</div>` : ''}
          ${employeeName ? `<div>服務店員: ${employeeName}</div>` : ''}
          ${summary.orderNote ? `<div style="margin-top: 2mm; padding: 2mm; background: #eee; font-style: italic;">備註: ${summary.orderNote}</div>` : ''}
        </div>

        ${customer ? `
          <div class="customer-box">
            <div class="section-title">客戶資訊</div>
            <div>${customer.last_name}${customer.first_name}</div>
            <div>${customer.phone}</div>
            <div style="font-size: 9px;">${customer.address}</div>
          </div>
        ` : ''}

        <div class="section-title">商品明細</div>
        ${items.map(item => {
          const imgUrl = item.images?.[0]?.src || 'https://picsum.photos/100';
          return `
          <div class="item-container">
            ${includeThumbnails ? `<img src="${imgUrl}" class="item-img" />` : ''}
            <div class="item-info">
              <div class="item-header">
                <span>${item.name} x ${item.quantity}</span>
                <span>$${Math.round((item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price)) * item.quantity)}</span>
              </div>
              <div class="item-details">
                單價: $${Math.round(item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price))}
                ${item.selectedVariation ? ` | 規格: ${item.selectedVariation.attributes.map(a => a.option).join(', ')}` : ''}
                ${item.note ? ` | 備註: ${item.note}` : ''}
              </div>
            </div>
          </div>
        `;}).join('')}

        <div class="totals">
          <div class="total-row">
            <span>小計</span>
            <span>$${Math.round(summary.subtotal)}</span>
          </div>
          ${summary.itemDiscountTotal > 0 ? `
            <div class="total-row">
              <span>商品折扣</span>
              <span>-$${Math.round(summary.itemDiscountTotal)}</span>
            </div>
          ` : ''}
          ${summary.orderDiscount > 0 ? `
            <div class="total-row">
              <span>整單折扣</span>
              <span>-$${Math.round(summary.orderDiscount)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>總計</span>
            <span>$${Math.round(summary.total)}</span>
          </div>
        </div>

        <div class="footer">
          謝謝光臨，歡迎再次預約！
        </div>

        <script>
          window.onload = function() {
            window.print();
            // window.close(); // Uncomment if you want the window to close after printing
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
