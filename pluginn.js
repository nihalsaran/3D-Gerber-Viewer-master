function addToCart(leadTime, unitPrice, orderValue) {
    // Prepare data to send to the server
    const data = {
        action: 'add_custom_product_to_cart', // The AJAX action to handle in PHP
        leadTime: leadTime,
        unitPrice: unitPrice,
        orderValue: orderValue,
        specifications: {
            boardType: document.querySelector('#boardType .selected')?.textContent || '',
            designInPanel: document.querySelector('#designInPanel .selected')?.textContent || '',
            size: {
                length: document.querySelector('.lengthgerb').value || '',
                width: document.querySelector('.widthgerb').value || ''
            },
            quantity: document.querySelector('.quantity-input').value || '1',
            layers: document.querySelector('#layers .selected')?.textContent || '',
            material: document.querySelector('#material .selected')?.textContent.trim() || '',
            thickness: document.querySelector('#thickness .selected')?.textContent || '',
            solderMask: document.querySelector('#solderMask .selected')?.textContent.trim() || '',
            silkscreen: document.querySelector('#silkscreen .selected')?.textContent.trim() || '',
            surfaceFinish: document.querySelector('#surfaceFinish .selected')?.textContent || ''
        },
    };

    // Send AJAX request to server
    jQuery.post(ajaxurl, data, function (response) {
        if (response.success) {
            // Show success message
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
            successMessage.textContent = 'Item added to cart successfully!';
            document.body.appendChild(successMessage);

            setTimeout(() => {
                successMessage.remove();
            }, 3000);
        } else {
            // Handle error
            alert('Failed to add item to cart.');
        }
    });
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

// Ensure ajaxurl is defined
var ajaxurl = ajax_object.ajaxurl;

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
from { opacity: 0; transform: translateY(-20px); }
to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
from { opacity: 1; transform: translateY(0); }
to { opacity: 0; transform: translateY(-20px); }
}
`;
document.head.appendChild(style);
