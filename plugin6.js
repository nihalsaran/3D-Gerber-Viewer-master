function addToCart(leadTime, unitPrice, orderValue) {

    if (!leadTime || !unitPrice || !orderValue) {
        alert('Missing required cart data');
        return;
    }
    // Prepare data to send to the server
    const data = {
        action: 'add_custom_product_to_cart',
        leadTime: leadTime,
        unitPrice: unitPrice.replace(/[^0-9.]/g, ''), // Remove non-numeric chars except decimal
        orderValue: orderValue.replace(/[^0-9.]/g, ''),
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

    console.log('Sending cart data:', data);

    // Send AJAX request to server using $.ajax
    $.ajax({
        url: ajax_object.ajax_url,
        dataType: 'json',
        type: 'POST',
        data: data,
        success: function(response) {
            console.log('AJAX response:', response);
            if (response.success) {
                showSuccessMessage('Item added to cart successfully!');
            } else {
                const errorMsg = response.data || 'Unknown error occurred';
                console.error('Cart error:', errorMsg);
                alert('Failed to add item to cart: ' + errorMsg);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('AJAX error:', {status: jqXHR.status, error: errorThrown});
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

// Modify the event listener to use the new addToCart function
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.add-to-cart-gerber').forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            const leadTime = row.cells[0].textContent;
            const unitPrice = row.cells[1].textContent;
            const orderValue = row.cells[2].textContent;

            // Add item to WooCommerce cart
            addToCart(leadTime, unitPrice, orderValue);
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // Add CSS for animations
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
