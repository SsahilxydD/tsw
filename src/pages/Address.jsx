import React, { useContext, useEffect, useState } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  landmark: "",
  city: "",
  state: "",
  zip: "",
  country: "India",
  addressType: "home",
};

export default function Address() {
  const { address, setAddress, navigate } = useContext(ShopContext);
  const [form, setForm] = useState(address || EMPTY);

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...(address || {}) }));
  }, [address]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setAddress(form);
    navigate("/payment");
  };

  return (
    <div className="border-t pt-14">
      <div className="mb-5">
        <CartSteps active="address" />
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto px-4">
        <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="firstName" value={form.firstName} onChange={onChange} className="border rounded px-3 h-11" placeholder="First name" autoComplete="given-name" required />
          <input name="lastName" value={form.lastName} onChange={onChange} className="border rounded px-3 h-11" placeholder="Last name" autoComplete="family-name" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input type="email" name="email" value={form.email} onChange={onChange} className="border rounded px-3 h-11" placeholder="Email (optional)" autoComplete="email" />
          <input name="phone" value={form.phone} onChange={onChange} className="border rounded px-3 h-11" placeholder="Phone" inputMode="tel" autoComplete="tel" pattern="[0-9+\-()\s]{7,15}" title="Enter a valid phone number" required />
        </div>

        <input name="address1" value={form.address1} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Address line 1" autoComplete="address-line1" required />
        <input name="address2" value={form.address2} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Address line 2 (optional)" autoComplete="address-line2" />
        <input name="landmark" value={form.landmark} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Landmark (optional)" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <input name="city" value={form.city} onChange={onChange} className="border rounded px-3 h-11" placeholder="City" autoComplete="address-level2" required />
          <input name="state" value={form.state} onChange={onChange} className="border rounded px-3 h-11" placeholder="State" autoComplete="address-level1" required />
          <input name="zip" value={form.zip} onChange={onChange} className="border rounded px-3 h-11" placeholder="PIN/Zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{4,10}" title="Enter a valid postal code" required />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 items-center">
          <input name="country" value={form.country} onChange={onChange} className="border rounded px-3 h-11" placeholder="Country" autoComplete="country-name" />
          <div className="flex items-center gap-3 text-sm">
            <label className="font-medium">Address Type:</label>
            <label className="flex items-center gap-1"><input type="radio" name="addressType" value="home" checked={form.addressType==='home'} onChange={onChange}/> Home</label>
            <label className="flex items-center gap-1"><input type="radio" name="addressType" value="work" checked={form.addressType==='work'} onChange={onChange}/> Work</label>
            <label className="flex items-center gap-1"><input type="radio" name="addressType" value="other" checked={form.addressType==='other'} onChange={onChange}/> Other</label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/cart')} className="px-5 py-3 border rounded text-sm">Back to bag</button>
          <button type="submit" className="px-6 py-3 rounded bg-black text-white text-sm">CONTINUE</button>
        </div>
      </form>
    </div>
  );
}
