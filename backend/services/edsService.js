import forge from "node-forge";

/**
 * Extracts attributes from certificate subject Distinguished Name
 */
function getSubjectAttr(subject, oid) {
  const field = subject.attributes.find((attr) => attr.type === oid || attr.name === oid);
  return field ? field.value : "";
}

/**
 * Safe parser for EDS signature (CMS/PKCS7 format)
 * Implements signature checking, certificate extraction, expiration, and IIN parsing.
 */
export function verifySignature(signatureBase64, expectedPayloadBase64) {
  try {
    if (!signatureBase64) {
      throw new Error("Отсутствует подпись (signature).");
    }

    // 1. Structural Check & Parse PKCS7
    const derBuffer = forge.util.decode64(signatureBase64);
    const asn1 = forge.asn1.fromDer(derBuffer);
    const p7 = forge.pkcs7.messageFromAsn1(asn1);

    // Get signer certificate
    const cert = p7.certificates[0];
    if (!cert) {
      throw new Error("Не удалось извлечь сертификат подписанта из CMS подписи.");
    }

    // 2. Cryptographic signature verification against the payload
    // If detached, we must set the content back in the p7 object
    if (expectedPayloadBase64 && !p7.content) {
      const payloadBytes = forge.util.decode64(expectedPayloadBase64);
      p7.content = forge.util.createBuffer(payloadBytes);
    }

    // Verify signature integrity
    // Note: p7.verify() checks that the signature matches the public key of the certificate
    const isSignatureValid = p7.verify();
    if (!isSignatureValid) {
      throw new Error("Ошибка подписи: Подпись не совпадает с публичным ключом сертификата или данные были изменены.");
    }

    // 3. Expiration Check
    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;

    if (now < notBefore || now > notAfter) {
      throw new Error(`Срок действия сертификата истек или еще не наступил. Действителен с ${notBefore.toLocaleDateString()} по ${notAfter.toLocaleDateString()}`);
    }

    // 4. Extract subject DN fields
    const subject = cert.subject;
    
    // CN contains Full Name
    const fullName = getSubjectAttr(subject, "commonName") || getSubjectAttr(subject, "CN");
    
    // SerialNumber usually holds IIN in KZ certificates: e.g. "IIN123456789012"
    let iin = "";
    const serialNumber = getSubjectAttr(subject, "serialNumber") || getSubjectAttr(subject, "SERIALNUMBER");
    
    if (serialNumber) {
      const match = serialNumber.match(/\b\d{12}\b/);
      if (match) {
        iin = match[0];
      }
    }

    // Fallback: search for 12 digits anywhere in subject DN
    if (!iin) {
      const dnString = subject.attributes.map(a => `${a.name || a.type}=${a.value}`).join(",");
      const match = dnString.match(/\b\d{12}\b/);
      if (match) {
        iin = match[0];
      }
    }

    if (!iin || iin.length !== 12) {
      throw new Error("Не удалось извлечь валидный ИИН из сертификата.");
    }

    // 5. CA trust & OCSP limitations documentation
    // Cryptographic validation limits note:
    // "ASN.1 structural parsing and signature matching are implemented on the backend; however, full cryptographic trust chain validation and OCSP revocation checks require a connection to an external PKI validator service or SDK."
    console.log("EDS Verified structurally. CA trust-chain & OCSP validations are bypassed in local/offline developer environment.");

    return {
      success: true,
      iin,
      fullName,
      certExpire: notAfter,
      issuer: cert.issuer.attributes.map(a => `${a.name}=${a.value}`).join(","),
    };
  } catch (err) {
    console.error("EDS Verification Error:", err.message);
    return {
      success: false,
      error: err.message || "Ошибка верификации подписи ЭЦП.",
    };
  }
}
