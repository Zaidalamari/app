<?php
/**
 * Plugin Name: Alameri Digital Integration
 * Plugin URI: https://alameridigital.com
 * Description: إضافة ربط متجر WordPress مع منصة Alameri Digital للبطاقات الرقمية
 * Version: 1.0.0
 * Author: Alameri Digital
 * Author URI: https://alameridigital.com
 * Text Domain: alameri-digital
 * Domain Path: /languages
 * License: GPL v2 or later
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ALAMERI_DIGITAL_VERSION', '1.0.0');
define('ALAMERI_DIGITAL_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ALAMERI_DIGITAL_PLUGIN_URL', plugin_dir_url(__FILE__));

class Alameri_Digital_Integration {
    
    private static $instance = null;
    private $api_url;
    private $api_key;
    private $api_secret;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->api_url = get_option('alameri_api_url', '');
        $this->api_key = get_option('alameri_api_key', '');
        $this->api_secret = get_option('alameri_api_secret', '');
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // Shortcodes
        add_shortcode('alameri_products', array($this, 'products_shortcode'));
        add_shortcode('alameri_categories', array($this, 'categories_shortcode'));
        add_shortcode('alameri_balance', array($this, 'balance_shortcode'));
        add_shortcode('alameri_purchase_form', array($this, 'purchase_form_shortcode'));
        
        // AJAX handlers
        add_action('wp_ajax_alameri_get_products', array($this, 'ajax_get_products'));
        add_action('wp_ajax_nopriv_alameri_get_products', array($this, 'ajax_get_products'));
        add_action('wp_ajax_alameri_purchase', array($this, 'ajax_purchase'));
        add_action('wp_ajax_nopriv_alameri_purchase', array($this, 'ajax_purchase'));
        add_action('wp_ajax_alameri_get_balance', array($this, 'ajax_get_balance'));
        
        // WooCommerce Integration
        if (class_exists('WooCommerce')) {
            add_action('woocommerce_order_status_completed', array($this, 'process_woo_order'));
            add_filter('woocommerce_product_data_tabs', array($this, 'add_product_data_tab'));
            add_action('woocommerce_product_data_panels', array($this, 'add_product_data_panel'));
            add_action('woocommerce_process_product_meta', array($this, 'save_product_meta'));
        }
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Alameri Digital', 'alameri-digital'),
            __('Alameri Digital', 'alameri-digital'),
            'manage_options',
            'alameri-digital',
            array($this, 'admin_page'),
            'dashicons-cart',
            30
        );
        
        add_submenu_page(
            'alameri-digital',
            __('المنتجات', 'alameri-digital'),
            __('المنتجات', 'alameri-digital'),
            'manage_options',
            'alameri-products',
            array($this, 'products_page')
        );
        
        add_submenu_page(
            'alameri-digital',
            __('الطلبات', 'alameri-digital'),
            __('الطلبات', 'alameri-digital'),
            'manage_options',
            'alameri-orders',
            array($this, 'orders_page')
        );
    }
    
    public function register_settings() {
        register_setting('alameri_settings', 'alameri_api_url');
        register_setting('alameri_settings', 'alameri_api_key');
        register_setting('alameri_settings', 'alameri_api_secret');
        register_setting('alameri_settings', 'alameri_markup_percentage');
        register_setting('alameri_settings', 'alameri_auto_delivery');
    }
    
    public function admin_page() {
        ?>
        <div class="wrap" dir="rtl">
            <h1><?php _e('إعدادات Alameri Digital', 'alameri-digital'); ?></h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('alameri_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('رابط API', 'alameri-digital'); ?></th>
                        <td>
                            <input type="url" name="alameri_api_url" value="<?php echo esc_attr(get_option('alameri_api_url')); ?>" class="regular-text" placeholder="https://your-domain.replit.app" />
                            <p class="description"><?php _e('رابط منصة Alameri Digital الرئيسية', 'alameri-digital'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('مفتاح API', 'alameri-digital'); ?></th>
                        <td>
                            <input type="text" name="alameri_api_key" value="<?php echo esc_attr(get_option('alameri_api_key')); ?>" class="regular-text" placeholder="dk_xxxxxxxx" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('السر', 'alameri-digital'); ?></th>
                        <td>
                            <input type="password" name="alameri_api_secret" value="<?php echo esc_attr(get_option('alameri_api_secret')); ?>" class="regular-text" placeholder="ds_xxxxxxxx" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('نسبة الربح %', 'alameri-digital'); ?></th>
                        <td>
                            <input type="number" name="alameri_markup_percentage" value="<?php echo esc_attr(get_option('alameri_markup_percentage', 10)); ?>" min="0" max="100" step="0.5" />
                            <p class="description"><?php _e('النسبة المضافة على سعر الجملة', 'alameri-digital'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('التوصيل التلقائي', 'alameri-digital'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="alameri_auto_delivery" value="1" <?php checked(get_option('alameri_auto_delivery'), 1); ?> />
                                <?php _e('تسليم الأكواد تلقائياً بعد الدفع', 'alameri-digital'); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(__('حفظ الإعدادات', 'alameri-digital')); ?>
            </form>
            
            <hr>
            
            <h2><?php _e('اختبار الاتصال', 'alameri-digital'); ?></h2>
            <button type="button" id="test-connection" class="button button-secondary">
                <?php _e('اختبار الاتصال بالـ API', 'alameri-digital'); ?>
            </button>
            <div id="connection-result" style="margin-top: 10px;"></div>
            
            <hr>
            
            <h2><?php _e('الأكواد المختصرة', 'alameri-digital'); ?></h2>
            <table class="widefat">
                <thead>
                    <tr>
                        <th><?php _e('الكود', 'alameri-digital'); ?></th>
                        <th><?php _e('الوصف', 'alameri-digital'); ?></th>
                        <th><?php _e('المعاملات', 'alameri-digital'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>[alameri_products]</code></td>
                        <td><?php _e('عرض المنتجات', 'alameri-digital'); ?></td>
                        <td><code>category="1" limit="12" columns="3"</code></td>
                    </tr>
                    <tr>
                        <td><code>[alameri_categories]</code></td>
                        <td><?php _e('عرض التصنيفات', 'alameri-digital'); ?></td>
                        <td><code>columns="4"</code></td>
                    </tr>
                    <tr>
                        <td><code>[alameri_balance]</code></td>
                        <td><?php _e('عرض رصيد المحفظة', 'alameri-digital'); ?></td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td><code>[alameri_purchase_form]</code></td>
                        <td><?php _e('نموذج الشراء السريع', 'alameri-digital'); ?></td>
                        <td><code>product_id="123"</code></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#test-connection').on('click', function() {
                var $btn = $(this);
                var $result = $('#connection-result');
                
                $btn.prop('disabled', true).text('جاري الاختبار...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'alameri_get_balance'
                    },
                    success: function(response) {
                        if (response.success) {
                            $result.html('<div class="notice notice-success"><p>✅ الاتصال ناجح! الرصيد: ' + response.data.balance + ' ر.س</p></div>');
                        } else {
                            $result.html('<div class="notice notice-error"><p>❌ فشل الاتصال: ' + response.data + '</p></div>');
                        }
                    },
                    error: function() {
                        $result.html('<div class="notice notice-error"><p>❌ خطأ في الاتصال</p></div>');
                    },
                    complete: function() {
                        $btn.prop('disabled', false).text('اختبار الاتصال بالـ API');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    public function products_page() {
        $products = $this->api_request('/api/v1/products');
        ?>
        <div class="wrap" dir="rtl">
            <h1><?php _e('المنتجات المتاحة', 'alameri-digital'); ?></h1>
            
            <?php if (is_wp_error($products)): ?>
                <div class="notice notice-error">
                    <p><?php echo esc_html($products->get_error_message()); ?></p>
                </div>
            <?php elseif (empty($products)): ?>
                <div class="notice notice-warning">
                    <p><?php _e('لا توجد منتجات متاحة', 'alameri-digital'); ?></p>
                </div>
            <?php else: ?>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php _e('المنتج', 'alameri-digital'); ?></th>
                            <th><?php _e('التصنيف', 'alameri-digital'); ?></th>
                            <th><?php _e('سعر الجملة', 'alameri-digital'); ?></th>
                            <th><?php _e('سعر البيع', 'alameri-digital'); ?></th>
                            <th><?php _e('المتاح', 'alameri-digital'); ?></th>
                            <th><?php _e('إجراءات', 'alameri-digital'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        $markup = floatval(get_option('alameri_markup_percentage', 10));
                        foreach ($products as $product): 
                            $sell_price = $product['price'] * (1 + $markup / 100);
                        ?>
                        <tr>
                            <td><?php echo esc_html($product['name']); ?></td>
                            <td><?php echo esc_html($product['category'] ?? '-'); ?></td>
                            <td><?php echo number_format($product['price'], 2); ?> ر.س</td>
                            <td><?php echo number_format($sell_price, 2); ?> ر.س</td>
                            <td><?php echo intval($product['available'] ?? 0); ?></td>
                            <td>
                                <?php if (class_exists('WooCommerce')): ?>
                                <button type="button" class="button import-to-woo" data-product='<?php echo esc_attr(json_encode($product)); ?>'>
                                    <?php _e('استيراد إلى WooCommerce', 'alameri-digital'); ?>
                                </button>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }
    
    public function orders_page() {
        global $wpdb;
        $orders = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}alameri_orders ORDER BY created_at DESC LIMIT 100");
        ?>
        <div class="wrap" dir="rtl">
            <h1><?php _e('سجل الطلبات', 'alameri-digital'); ?></h1>
            
            <?php if (empty($orders)): ?>
                <div class="notice notice-info">
                    <p><?php _e('لا توجد طلبات بعد', 'alameri-digital'); ?></p>
                </div>
            <?php else: ?>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php _e('رقم الطلب', 'alameri-digital'); ?></th>
                            <th><?php _e('المنتج', 'alameri-digital'); ?></th>
                            <th><?php _e('الكمية', 'alameri-digital'); ?></th>
                            <th><?php _e('المبلغ', 'alameri-digital'); ?></th>
                            <th><?php _e('الحالة', 'alameri-digital'); ?></th>
                            <th><?php _e('التاريخ', 'alameri-digital'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($orders as $order): ?>
                        <tr>
                            <td><?php echo esc_html($order->order_id); ?></td>
                            <td><?php echo esc_html($order->product_name); ?></td>
                            <td><?php echo intval($order->quantity); ?></td>
                            <td><?php echo number_format($order->total, 2); ?> ر.س</td>
                            <td>
                                <span class="status-<?php echo esc_attr($order->status); ?>">
                                    <?php echo esc_html($order->status); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html($order->created_at); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }
    
    private function api_request($endpoint, $method = 'GET', $data = array()) {
        if (empty($this->api_url) || empty($this->api_key) || empty($this->api_secret)) {
            return new WP_Error('missing_credentials', __('يرجى إعداد بيانات API أولاً', 'alameri-digital'));
        }
        
        $url = rtrim($this->api_url, '/') . $endpoint;
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'X-API-Key' => $this->api_key,
                'X-API-Secret' => $this->api_secret,
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );
        
        if (!empty($data) && $method !== 'GET') {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        if (!$result) {
            return new WP_Error('invalid_response', __('استجابة غير صالحة من الخادم', 'alameri-digital'));
        }
        
        if (isset($result['success']) && !$result['success']) {
            return new WP_Error('api_error', $result['message'] ?? __('خطأ في API', 'alameri-digital'));
        }
        
        return $result['data'] ?? $result;
    }
    
    public function ajax_get_products() {
        $category = isset($_POST['category']) ? intval($_POST['category']) : null;
        
        $endpoint = '/api/v1/products';
        if ($category) {
            $endpoint .= '?category=' . $category;
        }
        
        $products = $this->api_request($endpoint);
        
        if (is_wp_error($products)) {
            wp_send_json_error($products->get_error_message());
        }
        
        wp_send_json_success($products);
    }
    
    public function ajax_purchase() {
        check_ajax_referer('alameri_purchase', 'nonce');
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
        $customer_email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        
        if (!$product_id) {
            wp_send_json_error(__('معرف المنتج مطلوب', 'alameri-digital'));
        }
        
        $result = $this->api_request('/api/v1/purchase', 'POST', array(
            'product_id' => $product_id,
            'quantity' => $quantity
        ));
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        // Save order locally
        $this->save_order($result, $customer_email);
        
        // Send email if configured
        if ($customer_email && !empty($result['codes'])) {
            $this->send_codes_email($customer_email, $result);
        }
        
        wp_send_json_success($result);
    }
    
    public function ajax_get_balance() {
        $result = $this->api_request('/api/v1/balance');
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        wp_send_json_success($result);
    }
    
    private function save_order($order_data, $customer_email = '') {
        global $wpdb;
        
        $wpdb->insert(
            $wpdb->prefix . 'alameri_orders',
            array(
                'order_id' => $order_data['order_id'] ?? '',
                'product_id' => $order_data['product_id'] ?? 0,
                'product_name' => $order_data['product_name'] ?? '',
                'quantity' => $order_data['quantity'] ?? 1,
                'total' => $order_data['total'] ?? 0,
                'codes' => json_encode($order_data['codes'] ?? array()),
                'customer_email' => $customer_email,
                'status' => 'completed',
                'created_at' => current_time('mysql')
            ),
            array('%s', '%d', '%s', '%d', '%f', '%s', '%s', '%s', '%s')
        );
    }
    
    private function send_codes_email($email, $order_data) {
        $subject = sprintf(__('طلبك من %s', 'alameri-digital'), get_bloginfo('name'));
        
        $message = sprintf(__('مرحباً،

شكراً لشرائك من %s.

تفاصيل طلبك:
المنتج: %s
الكمية: %d

الأكواد:
%s

شكراً لك!', 'alameri-digital'),
            get_bloginfo('name'),
            $order_data['product_name'] ?? '',
            $order_data['quantity'] ?? 1,
            implode("\n", $order_data['codes'] ?? array())
        );
        
        wp_mail($email, $subject, $message);
    }
    
    public function products_shortcode($atts) {
        $atts = shortcode_atts(array(
            'category' => '',
            'limit' => 12,
            'columns' => 3
        ), $atts);
        
        ob_start();
        ?>
        <div class="alameri-products" data-category="<?php echo esc_attr($atts['category']); ?>" data-limit="<?php echo esc_attr($atts['limit']); ?>" data-columns="<?php echo esc_attr($atts['columns']); ?>">
            <div class="alameri-products-grid" style="display: grid; grid-template-columns: repeat(<?php echo intval($atts['columns']); ?>, 1fr); gap: 20px;">
                <div class="alameri-loading"><?php _e('جاري التحميل...', 'alameri-digital'); ?></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function categories_shortcode($atts) {
        $atts = shortcode_atts(array(
            'columns' => 4
        ), $atts);
        
        ob_start();
        ?>
        <div class="alameri-categories" data-columns="<?php echo esc_attr($atts['columns']); ?>">
            <div class="alameri-categories-grid" style="display: grid; grid-template-columns: repeat(<?php echo intval($atts['columns']); ?>, 1fr); gap: 20px;">
                <div class="alameri-loading"><?php _e('جاري التحميل...', 'alameri-digital'); ?></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function balance_shortcode($atts) {
        ob_start();
        ?>
        <div class="alameri-balance">
            <span class="alameri-balance-label"><?php _e('الرصيد:', 'alameri-digital'); ?></span>
            <span class="alameri-balance-amount">--</span>
            <span class="alameri-balance-currency"><?php _e('ر.س', 'alameri-digital'); ?></span>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function purchase_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'product_id' => ''
        ), $atts);
        
        ob_start();
        ?>
        <div class="alameri-purchase-form">
            <form id="alameri-purchase-form">
                <?php wp_nonce_field('alameri_purchase', 'alameri_nonce'); ?>
                
                <div class="form-group">
                    <label><?php _e('المنتج', 'alameri-digital'); ?></label>
                    <select name="product_id" required>
                        <option value=""><?php _e('اختر المنتج', 'alameri-digital'); ?></option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label><?php _e('الكمية', 'alameri-digital'); ?></label>
                    <input type="number" name="quantity" value="1" min="1" required />
                </div>
                
                <div class="form-group">
                    <label><?php _e('البريد الإلكتروني', 'alameri-digital'); ?></label>
                    <input type="email" name="email" required />
                </div>
                
                <button type="submit" class="alameri-btn"><?php _e('شراء الآن', 'alameri-digital'); ?></button>
            </form>
            
            <div class="alameri-result" style="display: none;"></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function enqueue_scripts() {
        wp_enqueue_style('alameri-digital', ALAMERI_DIGITAL_PLUGIN_URL . 'assets/css/style.css', array(), ALAMERI_DIGITAL_VERSION);
        wp_enqueue_script('alameri-digital', ALAMERI_DIGITAL_PLUGIN_URL . 'assets/js/script.js', array('jquery'), ALAMERI_DIGITAL_VERSION, true);
        
        wp_localize_script('alameri-digital', 'alameriDigital', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('alameri_purchase'),
            'strings' => array(
                'loading' => __('جاري التحميل...', 'alameri-digital'),
                'error' => __('حدث خطأ', 'alameri-digital'),
                'success' => __('تمت العملية بنجاح', 'alameri-digital'),
                'addToCart' => __('أضف للسلة', 'alameri-digital'),
                'buyNow' => __('شراء الآن', 'alameri-digital'),
                'outOfStock' => __('غير متوفر', 'alameri-digital'),
                'currency' => __('ر.س', 'alameri-digital')
            )
        ));
    }
    
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'alameri') === false) {
            return;
        }
        
        wp_enqueue_style('alameri-admin', ALAMERI_DIGITAL_PLUGIN_URL . 'assets/css/admin.css', array(), ALAMERI_DIGITAL_VERSION);
    }
    
    // WooCommerce Integration
    public function process_woo_order($order_id) {
        if (!get_option('alameri_auto_delivery')) {
            return;
        }
        
        $order = wc_get_order($order_id);
        
        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            $alameri_product_id = get_post_meta($product_id, '_alameri_product_id', true);
            
            if (!$alameri_product_id) {
                continue;
            }
            
            $quantity = $item->get_quantity();
            
            $result = $this->api_request('/api/v1/purchase', 'POST', array(
                'product_id' => $alameri_product_id,
                'quantity' => $quantity
            ));
            
            if (!is_wp_error($result) && !empty($result['codes'])) {
                // Add codes to order note
                $codes = implode("\n", $result['codes']);
                $order->add_order_note(sprintf(
                    __('أكواد %s:%s%s', 'alameri-digital'),
                    $item->get_name(),
                    "\n",
                    $codes
                ));
                
                // Save codes to order meta
                $existing_codes = $order->get_meta('_alameri_codes', true) ?: array();
                $existing_codes[$product_id] = $result['codes'];
                $order->update_meta_data('_alameri_codes', $existing_codes);
                $order->save();
                
                // Send email to customer
                $this->send_codes_email($order->get_billing_email(), array(
                    'product_name' => $item->get_name(),
                    'quantity' => $quantity,
                    'codes' => $result['codes']
                ));
            }
        }
    }
    
    public function add_product_data_tab($tabs) {
        $tabs['alameri_digital'] = array(
            'label' => __('Alameri Digital', 'alameri-digital'),
            'target' => 'alameri_product_data',
            'class' => array()
        );
        return $tabs;
    }
    
    public function add_product_data_panel() {
        global $post;
        ?>
        <div id="alameri_product_data" class="panel woocommerce_options_panel">
            <div class="options_group">
                <?php
                woocommerce_wp_text_input(array(
                    'id' => '_alameri_product_id',
                    'label' => __('معرف منتج Alameri Digital', 'alameri-digital'),
                    'desc_tip' => true,
                    'description' => __('أدخل معرف المنتج من منصة Alameri Digital للربط التلقائي', 'alameri-digital')
                ));
                ?>
            </div>
        </div>
        <?php
    }
    
    public function save_product_meta($post_id) {
        if (isset($_POST['_alameri_product_id'])) {
            update_post_meta($post_id, '_alameri_product_id', sanitize_text_field($_POST['_alameri_product_id']));
        }
    }
    
    public function register_rest_routes() {
        register_rest_route('alameri-digital/v1', '/products', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_products'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route('alameri-digital/v1', '/purchase', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_purchase'),
            'permission_callback' => array($this, 'rest_permission_check')
        ));
    }
    
    public function rest_get_products() {
        $products = $this->api_request('/api/v1/products');
        
        if (is_wp_error($products)) {
            return new WP_Error('api_error', $products->get_error_message(), array('status' => 500));
        }
        
        return new WP_REST_Response($products, 200);
    }
    
    public function rest_purchase($request) {
        $product_id = $request->get_param('product_id');
        $quantity = $request->get_param('quantity') ?: 1;
        
        $result = $this->api_request('/api/v1/purchase', 'POST', array(
            'product_id' => $product_id,
            'quantity' => $quantity
        ));
        
        if (is_wp_error($result)) {
            return new WP_Error('purchase_failed', $result->get_error_message(), array('status' => 500));
        }
        
        return new WP_REST_Response($result, 200);
    }
    
    public function rest_permission_check() {
        return current_user_can('manage_options');
    }
    
    public static function activate() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}alameri_orders (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            order_id varchar(100) NOT NULL,
            product_id bigint(20) NOT NULL,
            product_name varchar(255) NOT NULL,
            quantity int(11) NOT NULL DEFAULT 1,
            total decimal(10,2) NOT NULL DEFAULT 0,
            codes longtext,
            customer_email varchar(255),
            status varchar(50) NOT NULL DEFAULT 'pending',
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY order_id (order_id),
            KEY product_id (product_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public static function deactivate() {
        // Cleanup if needed
    }
}

// Initialize
register_activation_hook(__FILE__, array('Alameri_Digital_Integration', 'activate'));
register_deactivation_hook(__FILE__, array('Alameri_Digital_Integration', 'deactivate'));

add_action('plugins_loaded', array('Alameri_Digital_Integration', 'get_instance'));
