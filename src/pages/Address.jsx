import React, { useContext, useEffect, useState } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "India",
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
          <input name="firstName" value={form.firstName} onChange={onChange} className="border rounded px-3 h-11" placeholder="First name" required />
          <input name="lastName" value={form.lastName} onChange={onChange} className="border rounded px-3 h-11" placeholder="Last name" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input type="email" name="email" value={form.email} onChange={onChange} className="border rounded px-3 h-11" placeholder="Email" />
          <input name="phone" value={form.phone} onChange={onChange} className="border rounded px-3 h-11" placeholder="Phone" required />
        </div>
        <input name="street" value={form.street} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Street" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input name="city" value={form.city} onChange={onChange} className="border rounded px-3 h-11" placeholder="City" required />
          <input name="state" value={form.state} onChange={onChange} className="border rounded px-3 h-11" placeholder="State" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input name="zip" value={form.zip} onChange={onChange} className="border rounded px-3 h-11" placeholder="Zipcode" required />
          <input name="country" value={form.country} onChange={onChange} className="border rounded px-3 h-11" placeholder="Country" />
        </div>

        <div className="mt-6 text-right">
          <button type="submit" className="px-6 py-3 rounded bg-black text-white text-sm">CONTINUE</button>
        </div>
      </form>
    </div>
  );
}

