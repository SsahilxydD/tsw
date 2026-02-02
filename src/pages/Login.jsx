import React, { useState } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import { validateEmail, validatePassword, validateName } from '../utils/validation'

const Login = () => {
    const [currentState, setCurrentState] = useState('Login');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});

    const onChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const errs = {};
        
        if (currentState === 'Sign Up') {
            const nameError = validateName(formData.name, 'Name');
            if (nameError) errs.name = nameError;
        }
        
        const emailError = validateEmail(formData.email);
        if (emailError) errs.email = emailError;
        
        const passwordError = validatePassword(formData.password, currentState === 'Sign Up');
        if (passwordError) errs.password = passwordError;
        
        return errs;
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        const errs = validate();
        
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        
        // Form is valid - handle submission
        // TODO: Implement actual login/signup logic
    }

    const switchMode = (mode) => {
        setCurrentState(mode);
        setFormData({ name: '', email: '', password: '' });
        setErrors({});
    };

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800'>
            <div className='inline-flex items-center gap-2 mb-2 mt-10'>
                <p className='prata-regular text-3xl'>{currentState}</p>
                <hr className=' border-none h-[1.5px] w-8 bg-gray-800' />
            </div>
            {currentState === 'Sign Up' && (
                <Input 
                    type="text" 
                    name="name"
                    placeholder='Name' 
                    value={formData.name}
                    onChange={onChange}
                    error={!!errors.name}
                    errorMessage={errors.name}
                    required 
                />
            )}
            <Input 
                type="email" 
                name="email"
                placeholder='Email' 
                value={formData.email}
                onChange={onChange}
                error={!!errors.email}
                errorMessage={errors.email}
                required 
            />
            <Input 
                type="password" 
                name="password"
                placeholder='Password' 
                value={formData.password}
                onChange={onChange}
                error={!!errors.password}
                errorMessage={errors.password}
                required 
            />
            <div className='w-full flex justify-between text-sm mt-[-8px]'>
                <p className='cursor-pointer hover:text-primary transition-colors'>Forgot your password?</p>
                {
                    currentState === 'Login'
                        ? <p onClick={() => switchMode('Sign Up')} className='cursor-pointer hover:text-primary transition-colors'>Create account</p>
                        : <p onClick={() => switchMode('Login')} className='cursor-pointer hover:text-primary transition-colors'>Login here</p>
                }
            </div>
            <Button type='submit' className='mt-4'>{currentState === 'Login' ? 'Sign in' : 'Sign up'}</Button>
        </form>
    )
}

export default Login
