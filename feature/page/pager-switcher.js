export function setupPageSwitcher() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    menuItems.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all menu items
            menuItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show the correct page
            pages.forEach(p => p.classList.remove('active'));
            const page = document.getElementById(btn.dataset.page);
            if (page) page.classList.add('active');
        });
    });
}
