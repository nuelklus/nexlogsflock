
import React, { useState } from 'react';
import { useAuth } from '@/auth/context/AuthContext';
import { RegisterFormInputs } from '@/auth/types';

const Register = () => {
  const { registerUser } = useAuth();
  const [formData, setFormData] = useState<RegisterFormInputs>({
    email: '',
    password: '',
    password2: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerUser(formData);
      // Optionally redirect to login or dashboard after successful registration
      alert('Registration successful!');
    } catch (error) {
      alert('Registration failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password2">Confirm Password:</label>
        <input
          type="password"
          id="password2"
          name="password2"
          value={formData.password2}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
