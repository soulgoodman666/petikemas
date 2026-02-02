// Run this script in browser console to create admin user
// Open: http://localhost:5173 then open console (F12)

async function createAdminUser() {
  const email = 'admin@petikemas.com';
  const password = 'admin123';
  
  try {
    // 1. Sign up user with admin role
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'admin',
          name: 'Super Admin'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('User already exists, updating metadata...');
        
        // 2. If user exists, sign in and update metadata
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInData.user) {
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: {
              role: 'admin',
              name: 'Super Admin'
            }
          });
          
          if (updateError) {
            console.error('Update error:', updateError);
          } else {
            console.log('✅ Admin user updated successfully!');
            console.log('Email:', email);
            console.log('Password:', password);
          }
        }
      } else {
        console.error('Signup error:', error);
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Please verify email if required, then login.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
createAdminUser();
