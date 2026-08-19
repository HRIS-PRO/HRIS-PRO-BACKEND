/**
 * Branded NOLT Finance email templates for the Asset Tracker app.
 * Each function accepts template variables and returns a complete HTML string.
 */

// ─── 1. Asset App Invite (to individual staff) ────────────────────────────────

export function buildAssetAppInviteEmail(firstName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited to the NOLT Asset App</title>
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0!important;padding:0!important;background-color:#e8f4fe;}
  </style>
</head>
<body>
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8f4fe;"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e8f4fe;">
  <tr>
    <td align="center" style="padding:40px 16px;background-color:#e8f4fe;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
        <tr><td><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:12px 12px 0 0;padding:28px 40px 24px;">
            <img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png" alt="NOLT Finance" width="150" style="display:block;height:auto;margin:0 auto 20px;">
            <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#031421;">Asset Management</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">You've Been Invited to the NOLT Asset App</p>
          </td>
        </tr></table></td></tr>
        <tr><td style="background-color:#ffffff;padding:36px 40px 20px;">
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#031421;">Hi ${firstName.trim()},</p>
          <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;">You have been granted access to the <strong style="color:#031421;">NOLT Asset Inventory (AssetTrackPro)</strong> — your central hub for tracking and managing company assets.</p>
          <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;">It gives you real-time visibility of assets assigned to you, lets you confirm receipts, flag issues, and keeps the asset register accurate.</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 20px;">
          <p style="margin:0 0 14px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#028ff5;">What You Can Do</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;"><tr><td width="28" style="vertical-align:top;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background-color:#028ff5;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;"><p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#ffffff;">1</p></td></tr></table></td><td style="vertical-align:middle;padding-left:8px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333333;"><strong style="color:#031421;">View assigned assets</strong> and their current status at a glance.</p></td></tr></table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;"><tr><td width="28" style="vertical-align:top;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background-color:#028ff5;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;"><p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#ffffff;">2</p></td></tr></table></td><td style="vertical-align:middle;padding-left:8px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333333;"><strong style="color:#031421;">Confirm receipts</strong> for assets delivered to you or your team.</p></td></tr></table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;"><tr><td width="28" style="vertical-align:top;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background-color:#028ff5;border-radius:50%;width:22px;height:22px;text-align:center;vertical-align:middle;"><p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#ffffff;">3</p></td></tr></table></td><td style="vertical-align:middle;padding-left:8px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333333;"><strong style="color:#031421;">Report faults or losses</strong> directly through the app for immediate IT review.</p></td></tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:8px;padding:20px 24px;" align="center">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;line-height:1.5;">Your access is ready.</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#031421;line-height:1.5;">Click below to get started.</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 28px;" align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="background-color:#028ff5;border-radius:6px;">
              <a href="https://asset.noltfinance.com" target="_blank" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 36px;white-space:nowrap;">Open the Asset App</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="4" style="background-color:#028ff5;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
            <td style="background-color:#e8f4fe;padding:14px 18px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.75;color:#333333;">If you experience any issues accessing the app, reply to this email or contact the IT Team on <a href='mailto:tech&#64;noltfinance.com' style='color:#028ff5;text-decoration:none;font-weight:700;'>tech&#64;noltfinance.com</a>.</p></td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 36px;">
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;">Best regards,</p>
          <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">IT Team</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#028ff5;">NOLT Finance Company Limited</p>
        </td></tr>
        <tr><td style="padding:0;line-height:0;font-size:0;"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Banner-Email.jpg" alt="NOLT Finance" width="600" style="display:block;width:100%;height:auto;border:0;"></td></tr>
        <tr><td style="background-color:#031421;border-radius:0 0 12px 12px;padding:28px 40px 20px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Get in Touch</p>
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:13px;line-height:2;color:#ade5fc;">
            <a href="mailto:customercare&#64;noltfinance.com" style="color:#ade5fc;text-decoration:none;display:block;">customercare&#64;noltfinance.com</a>
            <a href="tel:+2348149220557" style="color:#ade5fc;text-decoration:none;display:block;">+234 814 922 0557 (Call)</a>
            <a href="https://wa.me/2349111999002" target="_blank" style="color:#ade5fc;text-decoration:none;display:block;">+234 911 199 9002 (WhatsApp)</a>
          </p>
          <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Follow Us</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
            <td style="padding-right:8px;"><a href="https://www.noltfinance.com" target="_blank"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/website%20(1).png" alt="Website" width="40" height="40" style="display:block;border:0;"></a></td>
            <td style="padding-right:8px;"><a href="https://www.facebook.com/NOLT.Finance/" target="_blank"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/facebook%20(1).png" alt="Facebook" width="40" height="40" style="display:block;border:0;"></a></td>
            <td style="padding-right:8px;"><a href="https://www.instagram.com/noltfinance/" target="_blank"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/instagram%20(1).png" alt="Instagram" width="40" height="40" style="display:block;border:0;"></a></td>
            <td style="padding-right:8px;"><a href="https://ng.linkedin.com/company/noltfinance" target="_blank"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/linkedin%20(1).png" alt="LinkedIn" width="40" height="40" style="display:block;border:0;"></a></td>
            <td><a href="https://wa.me/2349111999002" target="_blank"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/whatsapp%20(1)%20(1).png" alt="WhatsApp" width="40" height="40" style="display:block;border:0;"></a></td>
          </tr></table>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5a7a99;text-align:center;">&#169; 2026 NOLT Finance Ltd.</p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#4a6a80;text-align:center;">No longer want to receive these emails? <a href="#" style="color:#4a6a80;text-decoration:underline;">Unsubscribe.</a></p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ─── 2. Asset Reallocation Notification (to assets@noltfinance.com / HR) ──────

export interface ReallocationEmailData {
    staffName: string;
    oldSerialNumber: string;
    newSerialNumber: string;
    laptopModel: string;
    laptopSpecs: string;
    reason: string;
    approvedBy: string;
    approvalDate: string;
}

export function buildAssetReallocationEmail(d: ReallocationEmailData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Reallocation Notification</title>
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0!important;padding:0!important;background-color:#e8f4fe;}
  </style>
</head>
<body>
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8f4fe;"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e8f4fe;">
  <tr>
    <td align="center" style="padding:40px 16px;background-color:#e8f4fe;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
        <tr><td><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:12px 12px 0 0;padding:28px 40px 24px;">
            <img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png" alt="NOLT Finance" width="150" style="display:block;height:auto;margin:0 auto 20px;">
            <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#031421;">Asset Management</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Asset Reallocation Notification</p>
          </td>
        </tr></table></td></tr>
        <tr><td style="background-color:#ffffff;padding:36px 40px 20px;">
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#031421;">Dear HR,</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;">Please be informed that the following asset has been reallocated and assigned to <strong style="color:#031421;">${d.staffName.trim()}</strong>.</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background-color:#031421;border-radius:8px;padding:0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background-color:#028ff5;border-radius:8px 8px 0 0;padding:10px 22px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#ffffff;">Asset Details</p></td></tr></table>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:18px 22px 14px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Assigned To</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#f8c14b;">${d.staffName.trim()}</p></td></tr>
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Old Serial Number</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.oldSerialNumber}</p></td></tr>
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">New Serial Number</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.newSerialNumber}</p></td></tr>
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Asset Model</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.laptopModel}</p></td></tr>
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Specifications</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.laptopSpecs}</p></td></tr>
                <tr><td width="160" style="vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Reason</p></td><td style="vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.reason}</p></td></tr>
              </table>
            </td></tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f9fe;border-radius:8px;"><tr><td style="padding:14px 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="50%" style="vertical-align:top;"><p style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Approved By</p><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">${d.approvedBy}</p></td>
              <td width="50%" style="vertical-align:top;text-align:right;"><p style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Approval Date</p><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">${d.approvalDate}</p></td>
            </tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="4" style="background-color:#028ff5;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
            <td style="background-color:#e8f4fe;padding:14px 18px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.75;color:#333333;">This notification is for HR and Store/Admin record-keeping purposes, to ensure accurate tracking of asset custody movements and support Internal Audit verification. Kindly update your records accordingly.</p></td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 36px;">
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;">Best regards,</p>
          <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">IT Team</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#028ff5;">NOLT Finance Company Limited</p>
        </td></tr>
        <tr><td style="background-color:#031421;border-radius:0 0 12px 12px;padding:28px 40px 20px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Get in Touch</p>
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:13px;line-height:2;color:#ade5fc;">
            <a href="mailto:customercare&#64;noltfinance.com" style="color:#ade5fc;text-decoration:none;display:block;">customercare&#64;noltfinance.com</a>
            <a href="tel:+2348149220557" style="color:#ade5fc;text-decoration:none;display:block;">+234 814 922 0557 (Call)</a>
            <a href="https://wa.me/2349111999002" target="_blank" style="color:#ade5fc;text-decoration:none;display:block;">+234 911 199 9002 (WhatsApp)</a>
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5a7a99;text-align:center;">&#169; 2026 NOLT Finance Ltd.</p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ─── 3. Asset Consent Request (to individual staff) ───────────────────────────

export interface ConsentRequestEmailData {
    firstName: string;
    serialNumber: string;
    laptopModel: string;
    laptopSpecs: string;
    consentUrl: string;
}

export function buildConsentRequestEmail(d: ConsentRequestEmailData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required — Your Consent Is Needed</title>
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0!important;padding:0!important;background-color:#e8f4fe;}
  </style>
</head>
<body>
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8f4fe;"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e8f4fe;">
  <tr>
    <td align="center" style="padding:40px 16px;background-color:#e8f4fe;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
        <tr><td><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:12px 12px 0 0;padding:28px 40px 24px;">
            <img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png" alt="NOLT Finance" width="150" style="display:block;height:auto;margin:0 auto 20px;">
            <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#031421;">Data Privacy &amp; Consent</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">We Need Your Consent to Proceed</p>
          </td>
        </tr></table></td></tr>
        <tr><td style="background-color:#ffffff;padding:36px 40px 20px;">
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#031421;">Hi ${d.firstName.trim()},</p>
          <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;">In line with the <strong style="color:#031421;">Workstation Administration and Lifecycle Policy</strong>, you are expected to provide your consent before processing your personal data on the NOLT Asset Inventory.</p>
          <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;">Data collected includes your name, staff ID, department, device assignment records, and in-app activity. The device assigned to you for this purpose is detailed below:</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background-color:#031421;border-radius:8px;padding:0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background-color:#028ff5;border-radius:8px 8px 0 0;padding:10px 22px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#ffffff;">Assigned Device</p></td></tr></table>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:18px 22px 14px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Serial Number</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#f8c14b;">${d.serialNumber}</p></td></tr>
                <tr><td width="160" style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Asset Model</p></td><td style="padding-bottom:12px;vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.laptopModel}</p></td></tr>
                <tr><td width="160" style="vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ade5fc;">Specifications</p></td><td style="vertical-align:top;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${d.laptopSpecs}</p></td></tr>
              </table>
            </td></tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:8px;padding:20px 24px;" align="center">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;line-height:1.5;">Review the full consent notice and give your response.</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#031421;line-height:1.5;">Your response is required to activate your access.</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 28px;" align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="background-color:#028ff5;border-radius:6px;">
              <a href="${d.consentUrl}" target="_blank" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 36px;white-space:nowrap;">Review &amp; Give Consent</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 28px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.75;color:#888888;text-align:center;">Questions? Reach the IT Team: <a href="mailto:tech&#64;noltfinance.com" style="color:#028ff5;text-decoration:none;">tech&#64;noltfinance.com</a></p></td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 36px;">
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;">Best regards,</p>
          <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">IT Team</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#028ff5;">NOLT Finance Company Limited</p>
        </td></tr>
        <tr><td style="padding:0;line-height:0;font-size:0;"><img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Banner-Email.jpg" alt="NOLT Finance" width="600" style="display:block;width:100%;height:auto;border:0;"></td></tr>
        <tr><td style="background-color:#031421;border-radius:0 0 12px 12px;padding:28px 40px 20px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Get in Touch</p>
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:13px;line-height:2;color:#ade5fc;">
            <a href="mailto:customercare&#64;noltfinance.com" style="color:#ade5fc;text-decoration:none;display:block;">customercare&#64;noltfinance.com</a>
            <a href="tel:+2348149220557" style="color:#ade5fc;text-decoration:none;display:block;">+234 814 922 0557 (Call)</a>
            <a href="https://wa.me/2349111999002" target="_blank" style="color:#ade5fc;text-decoration:none;display:block;">+234 911 199 9002 (WhatsApp)</a>
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5a7a99;text-align:center;">&#169; 2026 NOLT Finance Ltd.</p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#4a6a80;text-align:center;">No longer want to receive these emails? <a href="#" style="color:#4a6a80;text-decoration:underline;">Unsubscribe.</a></p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ─── 4. Asset Consent Signed (to HR) ──────────────────────────────────────────

export function buildConsentSignedEmail(custodianName: string, assetName: string, assetId: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Consent Signed</title>
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0!important;padding:0!important;background-color:#e8f4fe;}
  </style>
</head>
<body>
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8f4fe;"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e8f4fe;">
  <tr>
    <td align="center" style="padding:40px 16px;background-color:#e8f4fe;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
        <tr><td><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:12px 12px 0 0;padding:28px 40px 24px;">
            <img src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png" alt="NOLT Finance" width="150" style="display:block;height:auto;margin:0 auto 20px;">
            <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#031421;">Asset Management</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Asset Consent Signed</p>
          </td>
        </tr></table></td></tr>
        <tr><td style="background-color:#ffffff;padding:36px 40px 20px;">
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#031421;">Dear HR,</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333333;"><strong style="color:#031421;">${custodianName.trim()}</strong> has formally signed the consent form for the assigned asset: <strong style="color:#031421;">${assetName}</strong> (${assetId}).</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td background="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png" style="background-color:#0b8ff2;background-image:url('https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/Pattern-Blue-Bckground.png');background-size:cover;background-repeat:no-repeat;background-position:center center;border-radius:8px;padding:20px 24px;" align="center">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;line-height:1.5;">You can view the signed document in the AssetTrackPro dashboard, or see the attached PDF generated directly from the frontend.</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 28px;" align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="background-color:#028ff5;border-radius:6px;">
              <a href="https://assets.noltfinance.com/consent/${assetId}/document" target="_blank" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 36px;white-space:nowrap;">View Online Document</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 36px;">
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:13px;color:#333333;">Best regards,</p>
          <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#031421;">IT Team</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#028ff5;">NOLT Finance Company Limited</p>
        </td></tr>
        <tr><td style="background-color:#031421;border-radius:0 0 12px 12px;padding:28px 40px 20px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#028ff5;">Get in Touch</p>
          <p style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:13px;line-height:2;color:#ade5fc;">
            <a href="mailto:customercare&#64;noltfinance.com" style="color:#ade5fc;text-decoration:none;display:block;">customercare&#64;noltfinance.com</a>
            <a href="tel:+2348149220557" style="color:#ade5fc;text-decoration:none;display:block;">+234 814 922 0557 (Call)</a>
            <a href="https://wa.me/2349111999002" target="_blank" style="color:#ade5fc;text-decoration:none;display:block;">+234 911 199 9002 (WhatsApp)</a>
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5a7a99;text-align:center;">&#169; 2026 NOLT Finance Ltd.</p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

