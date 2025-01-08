function addToCart(leadTime, unitPrice, orderValue) {
    if (!leadTime || !unitPrice || !orderValue) {
        alert('Missing required cart data');
        return;
    }
    
    const data = {
        action: 'add_custom_product_to_cart',
        security_nonce: ajax_object.security_nonce,
        leadTime: leadTime,
        unitPrice: unitPrice.replace(/[^0-9.]/g, ''),
        orderValue: parseFloat(orderValue.replace(/[^0-9.]/g, '')).toFixed(2),
        specifications: {
            boardType: document.querySelector('#boardType .selected')?.textContent?.trim() || '',
            designInPanel: document.querySelector('#designInPanel .selected')?.textContent?.trim() || '',
            size: {
                length: document.querySelector('.lengthgerb').value || '',
                width: document.querySelector('.widthgerb').value || ''
            },
            quantity: document.querySelector('.quantity-input').value || '1',
            layers: document.querySelector('#layers .selected')?.textContent?.trim() || '',
            material: document.querySelector('#material .selected')?.textContent?.trim() || '',
            thickness: document.querySelector('#thickness .selected')?.textContent?.trim() || '',
            solderMask: document.querySelector('#solderMask .selected')?.textContent?.trim() || '',
            silkscreen: document.querySelector('#silkscreen .selected')?.textContent?.trim() || '',
            surfaceFinish: document.querySelector('#surfaceFinish .selected')?.textContent?.trim() || ''
        }
    };

    jQuery.ajax({
        url: ajax_object.ajax_url,
        dataType: 'json',
        type: 'POST',
        data: data,
        success: function(response) {
            if (response.success) {
                showSuccessMessage(response.data.message);
                // Optional: window.location.href = response.data.cart_url;
            } else {
                const errorMsg = response.data || 'Unknown error occurred';
                alert('Failed to add item to cart: ' + errorMsg);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert(`Server error: ${textStatus}. Please try again.`);
        }
    });
}

function showSuccessMessage(message) {
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
    `;
    successMessage.textContent = message;
    document.body.appendChild(successMessage);
    setTimeout(() => successMessage.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.add-to-cart-gerber').forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            const leadTime = row.cells[0].textContent;
            const unitPrice = row.cells[1].textContent;
            const orderValue = row.cells[2].textContent;
            addToCart(leadTime, unitPrice, orderValue);
        });
    });

    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    `;
    document.head.appendChild(animationStyle);
});
