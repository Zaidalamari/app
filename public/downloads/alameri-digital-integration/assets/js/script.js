/**
 * Alameri Digital Integration - Frontend Scripts
 */
(function($) {
    'use strict';

    var AlameriDigital = {
        init: function() {
            this.loadProducts();
            this.loadCategories();
            this.loadBalance();
            this.initPurchaseForm();
        },

        loadProducts: function() {
            var $containers = $('.alameri-products');
            
            $containers.each(function() {
                var $container = $(this);
                var $grid = $container.find('.alameri-products-grid');
                var category = $container.data('category');
                var limit = $container.data('limit') || 12;

                $.ajax({
                    url: alameriDigital.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'alameri_get_products',
                        category: category
                    },
                    success: function(response) {
                        if (response.success && response.data) {
                            var products = response.data.slice(0, limit);
                            AlameriDigital.renderProducts($grid, products);
                        } else {
                            $grid.html('<div class="alameri-error">' + alameriDigital.strings.error + '</div>');
                        }
                    },
                    error: function() {
                        $grid.html('<div class="alameri-error">' + alameriDigital.strings.error + '</div>');
                    }
                });
            });
        },

        renderProducts: function($grid, products) {
            var html = '';
            
            products.forEach(function(product) {
                var inStock = product.available > 0;
                var stockClass = inStock ? '' : 'out-of-stock';
                var stockText = inStock ? product.available + ' ' + alameriDigital.strings.available : alameriDigital.strings.outOfStock;
                
                html += '<div class="alameri-product-card" data-product-id="' + product.id + '">';
                
                if (product.image) {
                    html += '<img src="' + product.image + '" alt="' + product.name + '" class="alameri-product-image">';
                } else {
                    html += '<div class="alameri-product-image" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">🎮</div>';
                }
                
                html += '<div class="alameri-product-content">';
                html += '<div class="alameri-product-category">' + (product.category || '') + '</div>';
                html += '<h3 class="alameri-product-title">' + product.name + '</h3>';
                html += '<div class="alameri-product-price">' + parseFloat(product.price).toFixed(2) + ' ' + alameriDigital.strings.currency + '</div>';
                html += '<div class="alameri-product-stock ' + stockClass + '">' + stockText + '</div>';
                
                if (inStock) {
                    html += '<button class="alameri-btn alameri-buy-btn" data-product=\'' + JSON.stringify(product) + '\'>' + alameriDigital.strings.buyNow + '</button>';
                } else {
                    html += '<button class="alameri-btn" disabled>' + alameriDigital.strings.outOfStock + '</button>';
                }
                
                html += '</div></div>';
            });
            
            $grid.html(html);
            
            // Bind buy button events
            $grid.find('.alameri-buy-btn').on('click', function() {
                var product = $(this).data('product');
                AlameriDigital.showPurchaseModal(product);
            });
        },

        loadCategories: function() {
            var $containers = $('.alameri-categories');
            
            $containers.each(function() {
                var $container = $(this);
                var $grid = $container.find('.alameri-categories-grid');

                $.ajax({
                    url: alameriDigital.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'alameri_get_products'
                    },
                    success: function(response) {
                        if (response.success && response.data) {
                            var categories = {};
                            response.data.forEach(function(product) {
                                if (product.category && !categories[product.category]) {
                                    categories[product.category] = {
                                        name: product.category,
                                        icon: product.category_icon || '📦'
                                    };
                                }
                            });
                            AlameriDigital.renderCategories($grid, Object.values(categories));
                        }
                    }
                });
            });
        },

        renderCategories: function($grid, categories) {
            var html = '';
            
            categories.forEach(function(category) {
                html += '<div class="alameri-category-card">';
                html += '<div class="alameri-category-icon">' + category.icon + '</div>';
                html += '<div class="alameri-category-name">' + category.name + '</div>';
                html += '</div>';
            });
            
            $grid.html(html);
        },

        loadBalance: function() {
            var $balance = $('.alameri-balance-amount');
            
            if ($balance.length === 0) return;

            $.ajax({
                url: alameriDigital.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'alameri_get_balance'
                },
                success: function(response) {
                    if (response.success && response.data) {
                        $balance.text(parseFloat(response.data.balance).toFixed(2));
                    }
                }
            });
        },

        initPurchaseForm: function() {
            var $form = $('#alameri-purchase-form');
            
            if ($form.length === 0) return;

            // Load products into select
            $.ajax({
                url: alameriDigital.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'alameri_get_products'
                },
                success: function(response) {
                    if (response.success && response.data) {
                        var $select = $form.find('select[name="product_id"]');
                        response.data.forEach(function(product) {
                            $select.append('<option value="' + product.id + '">' + product.name + ' - ' + product.price + ' ' + alameriDigital.strings.currency + '</option>');
                        });
                    }
                }
            });

            // Handle form submission
            $form.on('submit', function(e) {
                e.preventDefault();
                AlameriDigital.processPurchase($form);
            });
        },

        showPurchaseModal: function(product) {
            var html = '<div class="alameri-modal-overlay">';
            html += '<div class="alameri-modal">';
            html += '<div class="alameri-modal-header">';
            html += '<span class="alameri-modal-title">شراء ' + product.name + '</span>';
            html += '<button class="alameri-modal-close">&times;</button>';
            html += '</div>';
            html += '<div class="alameri-modal-body">';
            html += '<form id="alameri-modal-form">';
            html += '<input type="hidden" name="product_id" value="' + product.id + '">';
            html += '<div class="form-group">';
            html += '<label>الكمية</label>';
            html += '<input type="number" name="quantity" value="1" min="1" max="' + product.available + '" required>';
            html += '</div>';
            html += '<div class="form-group">';
            html += '<label>البريد الإلكتروني (لاستلام الأكواد)</label>';
            html += '<input type="email" name="email" required>';
            html += '</div>';
            html += '<div class="form-group">';
            html += '<strong>السعر الإجمالي: <span id="modal-total">' + product.price + '</span> ' + alameriDigital.strings.currency + '</strong>';
            html += '</div>';
            html += '</form>';
            html += '<div class="alameri-result" style="display: none;"></div>';
            html += '</div>';
            html += '<div class="alameri-modal-footer">';
            html += '<button class="alameri-btn" id="modal-submit">' + alameriDigital.strings.buyNow + '</button>';
            html += '</div>';
            html += '</div></div>';

            $('body').append(html);

            var $modal = $('.alameri-modal-overlay');
            var $quantityInput = $modal.find('input[name="quantity"]');

            $quantityInput.on('change input', function() {
                var qty = parseInt($(this).val()) || 1;
                var total = (qty * product.price).toFixed(2);
                $('#modal-total').text(total);
            });

            $modal.find('.alameri-modal-close').on('click', function() {
                $modal.remove();
            });

            $modal.on('click', function(e) {
                if ($(e.target).hasClass('alameri-modal-overlay')) {
                    $modal.remove();
                }
            });

            $('#modal-submit').on('click', function() {
                var $form = $('#alameri-modal-form');
                AlameriDigital.processPurchase($form);
            });
        },

        processPurchase: function($form) {
            var $btn = $form.closest('.alameri-modal, .alameri-purchase-form').find('.alameri-btn');
            var $result = $form.closest('.alameri-modal-body, .alameri-purchase-form').find('.alameri-result');

            $btn.prop('disabled', true).text(alameriDigital.strings.loading);

            $.ajax({
                url: alameriDigital.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'alameri_purchase',
                    nonce: alameriDigital.nonce,
                    product_id: $form.find('[name="product_id"]').val(),
                    quantity: $form.find('[name="quantity"]').val(),
                    email: $form.find('[name="email"]').val()
                },
                success: function(response) {
                    if (response.success) {
                        var codes = response.data.codes || [];
                        var codesHtml = '<div class="alameri-codes">';
                        codes.forEach(function(code) {
                            codesHtml += '<div class="alameri-code-item">' + code + '</div>';
                        });
                        codesHtml += '</div>';

                        $result.removeClass('error').addClass('success').html(
                            '<strong>' + alameriDigital.strings.success + '</strong><br>' +
                            'تم إرسال الأكواد إلى بريدك الإلكتروني' + codesHtml
                        ).show();
                    } else {
                        $result.removeClass('success').addClass('error').html(response.data).show();
                    }
                },
                error: function() {
                    $result.removeClass('success').addClass('error').html(alameriDigital.strings.error).show();
                },
                complete: function() {
                    $btn.prop('disabled', false).text(alameriDigital.strings.buyNow);
                }
            });
        }
    };

    $(document).ready(function() {
        AlameriDigital.init();
    });

})(jQuery);
