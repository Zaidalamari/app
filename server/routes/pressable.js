const express = require('express');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const PRESSABLE_API_URL = 'https://my.pressable.com/v1';
const PRESSABLE_AUTH_URL = 'https://my.pressable.com/auth/token';

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.PRESSABLE_CLIENT_ID;
  const clientSecret = process.env.PRESSABLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Pressable API credentials not configured');
  }

  const formData = new URLSearchParams();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);

  const response = await fetch(PRESSABLE_AUTH_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with Pressable');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return cachedToken;
};

const pressableRequest = async (endpoint, method = 'GET', body = null) => {
  const token = await getAccessToken();

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PRESSABLE_API_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pressable API error: ${error}`);
  }

  return response.json();
};

router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const clientId = process.env.PRESSABLE_CLIENT_ID;
    const clientSecret = process.env.PRESSABLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.json({
        success: true,
        connected: false,
        message: 'لم يتم تكوين بيانات Pressable API'
      });
    }

    await getAccessToken();

    res.json({
      success: true,
      connected: true,
      message: 'متصل بـ Pressable بنجاح'
    });
  } catch (error) {
    res.json({
      success: true,
      connected: false,
      message: error.message
    });
  }
});

router.get('/sites', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await pressableRequest('/sites');

    res.json({
      success: true,
      sites: data.data || data
    });
  } catch (error) {
    console.error('Pressable sites error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/sites/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await pressableRequest(`/sites/${id}`);

    res.json({
      success: true,
      site: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/sites', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, php_version, datacenter_code } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الموقع مطلوب'
      });
    }

    const data = await pressableRequest('/sites', 'POST', {
      name,
      php_version: php_version || '8.2',
      datacenter_code: datacenter_code || 'DFW'
    });

    res.json({
      success: true,
      message: 'تم إنشاء الموقع بنجاح',
      site: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.delete('/sites/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pressableRequest(`/sites/${id}`, 'DELETE');

    res.json({
      success: true,
      message: 'تم حذف الموقع بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/collaborators', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await pressableRequest('/collaborators');

    res.json({
      success: true,
      collaborators: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/collaborators', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, site_ids } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب'
      });
    }

    const data = await pressableRequest('/collaborators', 'POST', {
      email,
      site_ids: site_ids || []
    });

    res.json({
      success: true,
      message: 'تمت إضافة المتعاون بنجاح',
      collaborator: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/datacenters', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await pressableRequest('/datacenters');

    res.json({
      success: true,
      datacenters: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/php-versions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await pressableRequest('/php-versions');

    res.json({
      success: true,
      versions: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/account', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await pressableRequest('/account');

    res.json({
      success: true,
      account: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/sites/:id/backup', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await pressableRequest(`/sites/${id}/backups`, 'POST');

    res.json({
      success: true,
      message: 'تم إنشاء نسخة احتياطية',
      backup: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/sites/:id/backups', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await pressableRequest(`/sites/${id}/backups`);

    res.json({
      success: true,
      backups: data.data || data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
