# Legacy Feature Documentation: EDS / NCALayer

This document describes the extracted logic and technical requirements for the Electronic Digital Signature (EDS / ЭЦП) integration.

---

## 1. Frontend Integration (NCALayer Connection)

The frontend communicates with NCALayer (a local background service run by users in Kazakhstan) via WebSocket.

- **WebSocket URLs**: `wss://127.0.0.1:13579/` or `ws://127.0.0.1:13579/`.
- **Primary Methods**:
  1. `getVersion()`: Checks if NCALayer is running and retrieves its version.
     - Payload:
       ```json
       {
         "module": "kz.gov.pki.knca.commonUtils",
         "method": "getVersion",
         "args": {}
       }
       ```
  2. `getKeyInfo()`: Prompts the user to select their PKCS12 file (keys) and extracts certificate parameters.
     - Payload:
       ```json
       {
         "module": "kz.gov.pki.knca.commonUtils",
         "method": "getKeyInfo",
         "args": ["PKCS12"]
       }
       ```
  3. `basicsSignCMS(base64Data)`: Signs a base64 payload using the user's certificate and returns a CMS (PKCS#7) signature block.
     - Payload:
       ```json
       {
         "module": "kz.gov.pki.knca.basics",
         "method": "sign",
         "args": {
           "allowedStorages": "PKCS12",
           "format": "cms",
           "data": "<BASE64_DATA>",
           "signingParams": {
             "encapsulate": false,
             "decode": true,
             "digested": false,
             "tsaProfile": {}
           },
           "signerParams": {
             "extKeyUsageOids": ["1.3.6.1.5.5.7.3.4"]
           },
           "locale": "ru"
         }
       }
       ```

---

## 2. Properties Extraction

The system maps properties returned from `getKeyInfo()` using `mapKeyInfo()`:
- **IIN Extraction**: Retrieve the 12-digit numeric IIN from the serialNumber attribute (`SERIALNUMBER=IIN<IIN_NUMBER>` or `SERIALNUMBER=<IIN_NUMBER>`) inside the subject DN.
- **Full Name**: Extracted from `subjectCn` (CN) or the `uniqueName` properties.
- **Expiration Date**: Extracted from the `notAfter` timestamp.

---

## 3. Backend Verification

The backend must not trust client-parsed properties. It must perform a verification cycle:

1. **Signature Verification**:
   - Parse the CMS structure (PKCS#7) using a cryptographic parser.
   - Verify that the signature matches the public key embedded in the certificate.
2. **Certificate Verification**:
   - Inspect the validity period (`notBefore` and `notAfter` dates) against the current server time.
   - Verify that the certificate extension attributes match key usage constraints.
3. **Chain of Trust Check**:
   - Verify that the certificate was issued by the trusted National Root CA (e.g., NCA PKI, KUC).
4. **Revocation Check (OCSP / CRL)**:
   - Perform an online validation check by querying the NCA OCSP responder (`http://ocsp.pki.gov.kz/`) or by matching against CRL files.
5. **IIN Matching**:
   - Extract the IIN directly from the verified certificate subject and log in the matching profile.

### Cryptographic Validation Disclaimer
> [!IMPORTANT]
> Full cryptographic verification of the NCA CA chain of trust and revocation (OCSP) requires the installation of NCA root certificates and online network access to the OCSP responder. If these external services are not active, the backend performs structural validation of the signature block and certificate properties parsing, logging a warning about the lack of external PKI trust-chain verification.
