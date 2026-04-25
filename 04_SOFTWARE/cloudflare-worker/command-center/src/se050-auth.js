// src/se050-auth.js
// SE050 Secure Element Authentication Client

export class SE050Authenticator {
  constructor() {
    this.reader = null;
    this.card = null;
    this.initialized = false;
  }
  
  async connect() {
    // Try NFC first (most common for secure elements)
    if ('NDEFReader' in window) {
      try {
        const ndef = new NDEFReader();
        await ndef.scan();
        
        ndef.onreading = event => {
          const { message, serialNumber } = event;
          this.card = { serialNumber, message };
          console.log('[SE050] NFC card detected:', serialNumber);
        };
        
        this.initialized = true;
        return true;
      } catch (err) {
        console.warn('[SE050] NFC not available:', err);
      }
    }
    
    // Fallback to WebUSB for development boards
    if (navigator.usb) {
      try {
        this.reader = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x04e6, productId: 0x5728 } // NXP SE050
          ]
        });
        
        await this.reader.open();
        await this.reader.selectConfiguration(1);
        await this.reader.claimInterface(0);
        
        this.initialized = true;
        console.log('[SE050] USB device connected');
        return true;
        
      } catch (err) {
        console.warn('[SE050] USB device not found:', err);
      }
    }
    
    console.warn('[SE050] No secure element interface available');
    return false;
  }
  
  async signChallenge(challenge) {
    if (this.card) {
      // NFC-based signing
      return this.signWithNFC(challenge);
    }
    
    if (this.reader) {
      // USB-based signing
      return this.signWithUSB(challenge);
    }
    
    throw new Error('No SE050 device connected');
  }
  
  async signWithNFC(challenge) {
    // In production, this would use Web Crypto API with hardware-backed keys
    // For demonstration, we simulate the signing process
    
    const encoder = new TextEncoder();
    const data = encoder.encode(challenge);
    
    // This would normally use crypto.subtle.sign with a hardware-backed key
    // For now, we create a deterministic signature
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signature;
  }
  
  async signWithUSB(challenge) {
    // SE050 USB signing command
    // This is a simplified representation
    
    const command = new Uint8Array([
      0x80, // CLA
      0x04, // INS: Sign
      0x00, // P1
      0x00, // P2
      challenge.length, // Lc
      ...new TextEncoder().encode(challenge)
    ]);
    
    const result = await this.reader.controlTransferIn({
      requestType: 'vendor',
      recipient: 'interface',
      request: 0x01,
      value: 0,
      index: 0
    }, command.length);
    
    // Parse response
    const signature = new Uint8Array(result.data.buffer);
    return btoa(String.fromCharCode(...signature));
  }
  
  async authenticate() {
    if (!this.initialized) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Cannot connect to SE050');
      }
    }
    
    // Get challenge from server
    const response = await fetch('/api/auth/challenge');
    const { challenge, timestamp } = await response.json();
    
    // Sign with SE050
    const signature = await this.signChallenge(challenge);
    
    // Send authentication request
    const authResponse = await fetch('/api/auth/mTLS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SE050-Signature': signature,
        'X-SE050-Timestamp': timestamp
      },
      body: JSON.stringify({
        certificate: await this.getCertificate(),
        device_id: this.card?.serialNumber
      })
    });
    
    if (!authResponse.ok) {
      throw new Error('Authentication failed');
    }
    
    return true;
  }
  
  async getCertificate() {
    // Retrieve device certificate from SE050
    // In production, this would extract the cert from secure element
    
    return `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKLdQVPy90WjMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjYwNDEyMTkzMzQ2WhcNMjYwNDEyMTkzMzQ2WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA0Z3VS5Jk0qG2w7x5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5
Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5
Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5
-----END CERTIFICATE-----`;
  }
}

// Auto-authentication on page load
export async function autoAuthenticate() {
  const se050 = new SE050Authenticator();
  
  try {
    const authenticated = await se050.authenticate();
    
    if (authenticated) {
      console.log('[SE050] Authentication successful');
      
      // Hide login screen, show dashboard
      const loginScreen = document.getElementById('login-screen');
      const dashboard = document.getElementById('dashboard');
      
      if (loginScreen) loginScreen.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      
      return true;
    }
  } catch (err) {
    console.warn('[SE050] Authentication failed:', err);
    // Fallback to manual login
  }
  
  return false;
}
