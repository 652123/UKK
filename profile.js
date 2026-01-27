document.addEventListener('DOMContentLoaded', async () => {

    // Wait for window.db
    let retries = 0;
    while (!window.db && retries < 20) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }
    if (!window.db) {
        Swal.fire('Error', 'Gagal memuat konfigurasi database.', 'error');
        return;
    }

    // 1. Cek Sesi
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) {
        window.location.href = 'index.html?login=true';
        return;
    }

    const user = session.user;
    const userId = user.id;

    // Fill Email (from Auth)
    document.getElementById('email').value = user.email;

    // 2. Load Profile Data
    await loadProfile();

    // 3. Handle Save Profile
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });

    // 4. Handle Change Password
    const passForm = document.getElementById('password-form');
    if (passForm) {
        passForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }

    // 5. Handle Avatar Upload
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            await uploadAvatar(file);
        });
    }


    // --- FUNCTIONS ---

    async function changePassword() {
        const passInput = document.getElementById('change-password-input').value;
        const btn = document.getElementById('pass-btn');

        if (!passInput) return;

        btn.disabled = true;
        btn.innerText = 'Updating...';

        try {
            const { error } = await window.db.auth.updateUser({ password: passInput });

            if (error) throw error;

            Swal.fire({ title: 'Sukses', text: 'Password berhasil diubah!', icon: 'success', background: '#121212', color: '#fff' });
            document.getElementById('password-form').reset();

        } catch (err) {
            Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', background: '#121212', color: '#fff' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Update Password';
        }
    }

    async function loadProfile() {
        try {
            const { data, error } = await window.db
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                document.getElementById('name').value = data.name || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('address').value = data.address || '';
                document.getElementById('province').value = data.province || '';
                document.getElementById('city').value = data.city || '';
                document.getElementById('postal_code').value = data.postal_code || '';

                // Load Avatar
                if (data.avatar_url) {
                    const avatarImg = document.getElementById('avatar-img');
                    if (data.avatar_url.startsWith('http')) {
                        avatarImg.src = data.avatar_url;
                    } else {
                        // Assume stored in 'product-images' bucket for simplicity as per plan
                        const { data: imgData } = window.db.storage.from('product-images').getPublicUrl(data.avatar_url);
                        avatarImg.src = imgData.publicUrl;
                    }
                }
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            Swal.fire({ title: 'Error', text: 'Gagal memuat profil.', icon: 'error', background: '#121212', color: '#fff' });
        }
    }

    async function updateProfile() {
        const btn = document.getElementById('save-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        const updates = {
            id: userId,
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            province: document.getElementById('province').value,
            city: document.getElementById('city').value,
            postal_code: document.getElementById('postal_code').value,
            updated_at: new Date()
        };

        try {
            const { error } = await window.db
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Profil berhasil diperbarui!',
                timer: 1500,
                showConfirmButton: false,
                background: '#121212',
                color: '#fff'
            });

        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire({ title: 'Error', text: error.message, icon: 'error', background: '#121212', color: '#fff' });
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async function uploadAvatar(file) {
        // Validate
        if (!file.type.match('image.*')) {
            Swal.fire({ title: 'Error', text: 'Mohon upload file gambar.', icon: 'error', background: '#121212', color: '#fff' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            Swal.fire({ title: 'Error', text: 'Ukuran maksimal file 2MB.', icon: 'error', background: '#121212', color: '#fff' });
            return;
        }

        // Show loading state on image
        const avatarImg = document.getElementById('avatar-img');
        const oldSrc = avatarImg.src;
        avatarImg.style.opacity = '0.5';

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

            // Upload to Bucket
            const { error: uploadError } = await window.db.storage
                .from('product-images') // Reusing existing bucket
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Update Profile
            const { error: updateError } = await window.db
                .from('profiles')
                .update({ avatar_url: fileName })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Update UI
            const { data } = window.db.storage.from('product-images').getPublicUrl(fileName);
            avatarImg.src = data.publicUrl;

            Swal.fire({
                icon: 'success',
                title: 'Foto Profil Diupdate',
                timer: 1500,
                showConfirmButton: false,
                background: '#121212',
                color: '#fff'
            });

        } catch (err) {
            console.error('Upload Error:', err);
            Swal.fire({ title: 'Gagal', text: 'Gagal upload foto: ' + err.message, icon: 'error', background: '#121212', color: '#fff' });
            avatarImg.src = oldSrc; // Revert on error
        } finally {
            avatarImg.style.opacity = '1';
        }
    }
});
