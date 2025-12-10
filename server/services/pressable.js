const https = require('https');

class PressableService {
  constructor() {
    this.clientId = process.env.PRESSABLE_CLIENT_ID;
    this.clientSecret = process.env.PRESSABLE_CLIENT_SECRET;
    this.baseUrl = 'my.pressable.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    return new Promise((resolve, reject) => {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              this.accessToken = response.access_token;
              this.tokenExpiry = Date.now() + (response.expires_in * 1000) - 60000;
              resolve(this.accessToken);
            } else {
              console.error('Pressable token error:', response);
              reject(new Error('Failed to get access token'));
            }
          } catch (e) {
            console.error('Pressable parse error:', e, data);
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write('grant_type=client_credentials');
      req.end();
    });
  }

  async createSite(siteName, phpVersion = '8.1') {
    const token = await this.getAccessToken();
    
    const cleanName = siteName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .substring(0, 50);

    if (cleanName.length < 3) {
      throw new Error('Site name must be at least 3 characters');
    }

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        name: cleanName,
        php_version: phpVersion
      });

      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/v1/sites',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('Pressable create site response:', response);
            
            if (res.statusCode >= 200 && res.statusCode < 300 && response.data) {
              resolve({
                success: true,
                site: response.data,
                siteId: response.data.id,
                siteName: response.data.name,
                siteUrl: response.data.url || `https://${cleanName}.mystagingwebsite.com`
              });
            } else {
              reject(new Error(response.message || response.error || 'Failed to create site'));
            }
          } catch (e) {
            console.error('Pressable create site parse error:', e, data);
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async getSite(siteId) {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: `/v1/sites/${siteId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && response.data) {
              resolve(response.data);
            } else {
              reject(new Error(response.message || 'Failed to get site'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async listSites() {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/v1/sites',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(response.data || []);
            } else {
              reject(new Error(response.message || 'Failed to list sites'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async deleteSite(siteId) {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: `/v1/sites/${siteId}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true });
            } else {
              reject(new Error(response.message || 'Failed to delete site'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = new PressableService();
