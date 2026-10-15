import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Menu,
  Calendar,
  Search,
  UserPlus,
  Users,
  Check,
  ChevronDown,
  X,
  User,
  Phone,
  MapPin,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { TopbarUserStatus } from './TopbarUserStatus';

interface AddCreditScreenProps {
  customers: Customer[];
  defaultCustomerName?: string;
  onOpenMobileMenu?: () => void;
  onBack: () => void;
  onSaveTransaction: (transaction: Transaction) => void;
  onAddNewCustomer?: (newCustomer: Customer) => void;
  storeOwners?: string;
}

interface ItemRow {
  id: string;
  name: string;
  qty: string;
  price: string;
}

const SARI_SARI_PRESETS = [
  'Rice (1 kg)',
  'Canned Sardines',
  'Instant Noodles',
  'Coffee 3-in-1',
  'Eggs (1 pc)',
  'Cooking Oil'
];

export const AddCreditScreen: React.FC<AddCreditScreenProps> = ({
  customers,
  defaultCustomerName = '',
  onOpenMobileMenu,
  onBack,
  onSaveTransaction,
  onAddNewCustomer,
  storeOwners = 'Ederlyn & Roderick Salas'
}) => {
  // Select initial customer (Juan Dela Cruz default or prop)
  const initialCustomer = useMemo(() => {
    if (defaultCustomerName) {
      const found = customers.find(
        (c) => c.name.toLowerCase() === defaultCustomerName.toLowerCase()
      );
      if (found) return found;
    }
    const juan = customers.find((c) => c.name.toLowerCase().includes('juan'));
    return (
      juan ||
      customers[0] || {
        id: 'CUST-001',
        name: 'Juan Dela Cruz',
        contactNumber: '09123456780',
        outstandingBalance: 350.0,
        address: 'Block 4, Lot 12, Purok 1'
      }
    );
  }, [customers, defaultCustomerName]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomer.id);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New customer inline registration state
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    if (isCustomerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomerDropdownOpen]);

  // Selected active customer
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || initialCustomer;
  }, [customers, selectedCustomerId, initialCustomer]);

  const currentBalance = currentCustomer.outstandingBalance;

  // Transaction fields
  const [description, setDescription] = useState('');
  const [totalItems, setTotalItems] = useState('');
  const [amount, setAmount] = useState('');
  const todayISO = new Date().toISOString().split('T')[0];
  const [transactionDate, setTransactionDate] = useState(todayISO);
  const [error, setError] = useState('');

  // Itemized input with prices state
  const [itemsMode, setItemsMode] = useState<'itemized' | 'simple'>('itemized');
  const [itemRows, setItemRows] = useState<ItemRow[]>([
    { id: '1', name: '', qty: '1', price: '' }
  ]);

  // Recalculate total amount, total items, and description summary from item rows
  const syncTotalsFromItems = (rows: ItemRow[]) => {
    let sumAmount = 0;
    let sumQty = 0;
    const descParts: string[] = [];

    rows.forEach((row) => {
      const q = parseFloat(row.qty) || 0;
      const p = parseFloat(row.price) || 0;
      const lineTotal = q * p;
      if (q > 0 && p > 0) {
        sumAmount += lineTotal;
      }
      if (q > 0) {
        sumQty += q;
      }
      if (row.name.trim()) {
        const qtyPrefix = q > 1 ? `${q}x ` : '';
        const priceSuffix = p > 0 ? ` (₱${lineTotal.toFixed(2)})` : '';
        descParts.push(`${qtyPrefix}${row.name.trim()}${priceSuffix}`);
      }
    });

    if (sumAmount > 0) {
      setAmount(sumAmount.toFixed(2));
    }
    if (sumQty > 0) {
      setTotalItems(String(sumQty));
    }
    if (descParts.length > 0) {
      setDescription(descParts.join(', '));
    }
  };

  const handleAddItemRow = (presetName?: string) => {
    const newRow: ItemRow = {
      id: String(Date.now() + Math.random()),
      name: presetName || '',
      qty: '1',
      price: ''
    };
    const updated = [...itemRows, newRow];
    setItemRows(updated);
    if (presetName) {
      syncTotalsFromItems(updated);
    }
  };

  const handleUpdateItemRow = (id: string, field: keyof ItemRow, val: string) => {
    const updated = itemRows.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    setItemRows(updated);
    syncTotalsFromItems(updated);
    if (error) setError('');
  };

  const handleRemoveItemRow = (id: string) => {
    if (itemRows.length <= 1) {
      const resetRow: ItemRow[] = [{ id: String(Date.now()), name: '', qty: '1', price: '' }];
      setItemRows(resetRow);
      setAmount('');
      setTotalItems('');
      setDescription('');
      return;
    }
    const updated = itemRows.filter((r) => r.id !== id);
    setItemRows(updated);
    syncTotalsFromItems(updated);
  };

  const numAmount = parseFloat(amount) || 0;
  const projectedBalance = currentBalance + numAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalCustomerName = currentCustomer.name;
    let finalCustomerId = currentCustomer.id;
    let effectiveBalance = currentBalance;

    if (isRegisteringNew) {
      const trimmedName = newCustName.trim();
      if (!trimmedName) {
        setError('Please enter the customer name.');
        return;
      }
      const existingMatch = customers.find(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingMatch) {
        finalCustomerName = existingMatch.name;
        finalCustomerId = existingMatch.id;
        effectiveBalance = existingMatch.outstandingBalance;
      } else {
        const newId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
        const createdCustomer: Customer = {
          id: newId,
          name: trimmedName,
          contactNumber: newCustPhone.trim() || 'N/A',
          outstandingBalance: 0,
          address: newCustAddress.trim() || 'Neighborhood Customer',
          joinedDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
          })
        };
        if (onAddNewCustomer) {
          onAddNewCustomer(createdCustomer);
        }
        finalCustomerName = trimmedName;
        finalCustomerId = newId;
        effectiveBalance = 0;
      }
    }

    let finalDescription = description.trim();
    let finalItems: { name: string; qty: number; price: number }[] = [];

    if (itemsMode === 'itemized') {
      const validItems = itemRows
        .filter((r) => r.name.trim() !== '')
        .map((r) => ({
          name: r.name.trim(),
          qty: parseFloat(r.qty) || 1,
          price: parseFloat(r.price) || 0
        }));

      if (validItems.length === 0 && !finalDescription) {
        setError('Please enter at least one item name and its price.');
        return;
      }

      if (validItems.length > 0) {
        finalItems = validItems;
        if (!finalDescription) {
          finalDescription = validItems
            .map(
              (it) =>
                `${it.qty > 1 ? `${it.qty}x ` : ''}${it.name}${
                  it.price > 0 ? ` (₱${(it.qty * it.price).toFixed(2)})` : ''
                }`
            )
            .join(', ');
        }
      }
    }

    if (!finalDescription) {
      setError('Please provide a description or items list.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid credit amount greater than zero.');
      return;
    }

    // Format date for display (MM/DD/YYYY)
    const [year, month, day] = transactionDate.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const newBal = effectiveBalance + numAmount;

    const newTxn: Transaction = {
      id: `TXN-${String(Math.floor(1000 + Math.random() * 9000))}`,
      date: formattedDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: finalCustomerName,
      customerId: finalCustomerId,
      type: 'Utang',
      amount: numAmount,
      balance: newBal,
      status: 'Unpaid',
      description: finalDescription,
      items: finalItems.length > 0 ? finalItems : undefined,
      notes: totalItems ? `${totalItems} items recorded` : undefined
    };

    onSaveTransaction(newTxn);
  };

  return (
    <div id="add-credit-screen" className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] min-h-screen">
      {/* Navigation Header */}
      <header
        id="add-credit-header"
        className="bg-white border-b border-gray-200/80 px-4 sm:px-8 py-5"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              id="add-credit-mobile-menu-btn"
              onClick={onOpenMobileMenu}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden focus:outline-none cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              id="back-btn"
              onClick={onBack}
              className="p-2 -ml-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1
                id="add-credit-page-title"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight"
              >
                Add Utang / Record Credit
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Record a new credit transaction for Neneng's Store
              </p>
            </div>
          </div>

          {/* Right: Notification Bell and SO Profile Avatar */}
          <TopbarUserStatus storeOwners={storeOwners} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-8 py-8 sm:py-10 max-w-4xl w-full mx-auto">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {error && (
            <div
              id="add-credit-error-alert"
              className="p-3.5 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-800 text-xs font-semibold uppercase tracking-wider ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Current Balance Highlight Card (Matches Record Payment style) */}
          <div
            id="current-balance-card"
            className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 relative"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                {/* Uppercase text "CURRENT BALANCE" */}
                <p
                  id="current-balance-heading"
                  className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"
                >
                  CURRENT BALANCE
                </p>

                {/* Large bold orange balance display "₱350.00" */}
                <p
                  id="current-balance-display"
                  className="text-3xl sm:text-4xl font-extrabold text-[#f97316] font-mono tracking-tight"
                >
                  ₱{currentBalance.toFixed(2)}
                </p>

                <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-semibold text-gray-800">{currentCustomer.name}</span>
                  <span className="text-gray-400">({currentCustomer.contactNumber})</span>
                </p>
              </div>

              {/* Customer selection drop-down icon button on the right */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="customer-dropdown-toggle-btn"
                  onClick={() => {
                    setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                    setCustomerSearchQuery('');
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                >
                  <span className="max-w-[120px] sm:max-w-[160px] truncate">
                    {currentCustomer.name}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isCustomerDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Popup with Smooth Scrolling */}
                {isCustomerDropdownOpen && (
                  <div
                    id="customer-dropdown-menu"
                    className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    {/* Header & Quick Search */}
                    <div className="p-2.5 bg-gray-50/80 border-b border-gray-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          placeholder="Search customer..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 overscroll-contain">
                      {customers
                        .filter((cust) =>
                          cust.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                        )
                        .map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setIsRegisteringNew(false);
                              setIsCustomerDropdownOpen(false);
                              if (error) setError('');
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                              cust.id === currentCustomer.id && !isRegisteringNew
                                ? 'bg-orange-50/80 text-orange-950 font-semibold'
                                : 'text-gray-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate text-xs font-medium text-gray-900">
                                {cust.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{cust.contactNumber}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                                  cust.outstandingBalance > 0
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                }`}
                              >
                                ₱{cust.outstandingBalance.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        ))}
                      {customers.filter((cust) =>
                        cust.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-4 text-xs text-center text-gray-400">
                          No customers found
                        </div>
                      )}
                    </div>

                    {/* Register New Suki Option */}
                    <div className="p-2 bg-gray-50 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisteringNew(true);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="w-full py-1.5 px-3 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Register New Suki</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inline New Customer Registration Banner */}
          {isRegisteringNew && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Registering New Suki
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisteringNew(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                >
                  Cancel (Use Existing)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g., Aling Tessie Ramos"
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="0917-123-4567"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address / Purok (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g., Purok 2"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Card (Matches Record Payment style) */}
          <form
            id="credit-form-card"
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-5"
          >
            {/* Description / Items Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Description / Items <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Input individual items with prices and quantities to calculate total
                  </p>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    id="mode-itemized-btn"
                    onClick={() => setItemsMode('itemized')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      itemsMode === 'itemized'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Input with Prices
                  </button>
                  <button
                    type="button"
                    id="mode-simple-btn"
                    onClick={() => setItemsMode('simple')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      itemsMode === 'simple'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quick Text
                  </button>
                </div>
              </div>

              {itemsMode === 'itemized' ? (
                <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  {/* Table Headers for Desktop */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                    <div className="sm:col-span-4">Item Name / Description</div>
                    <div className="sm:col-span-2 text-center">Qty</div>
                    <div className="sm:col-span-3 text-center">Unit Price (₱)</div>
                    <div className="sm:col-span-3 text-right pr-7">Subtotal (₱)</div>
                  </div>

                  {/* Item Rows */}
                  <div className="space-y-3">
                    {itemRows.map((row, idx) => {
                      const q = parseFloat(row.qty) || 0;
                      const p = parseFloat(row.price) || 0;
                      const lineTotal = q * p;

                      return (
                        <div
                          key={row.id}
                          className="flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 items-stretch sm:items-center bg-white p-3 rounded-xl border border-gray-200 transition-colors shadow-2xs"
                        >
                          {/* Item Name */}
                          <div className="w-full sm:col-span-4">
                            <span className="sm:hidden text-xs font-bold text-gray-600 mb-1 block">
                              Item #{idx + 1}:
                            </span>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleUpdateItemRow(row.id, 'name', e.target.value)}
                              placeholder="e.g., Rice 1kg, Lucky Me, Coffee..."
                              className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f97316]"
                            />
                          </div>

                          {/* Qty & Price on Mobile side-by-side */}
                          <div className="grid grid-cols-2 sm:contents gap-2.5">
                            <div className="sm:col-span-2">
                              <span className="sm:hidden text-xs font-medium text-gray-600 mb-1 block">
                                Qty:
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={row.qty}
                                onChange={(e) => handleUpdateItemRow(row.id, 'qty', e.target.value)}
                                placeholder="1"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm text-center text-gray-900 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f97316]"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <span className="sm:hidden text-xs font-medium text-gray-600 mb-1 block">
                                Price (₱):
                              </span>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold pointer-events-none">
                                  ₱
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={row.price}
                                  onChange={(e) => handleUpdateItemRow(row.id, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f97316]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Line total & Delete */}
                          <div className="w-full sm:col-span-3 flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                            <div className="text-right">
                              <span className="sm:hidden text-xs text-gray-500 mr-1.5">Line Total:</span>
                              <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap">
                                ₱{lineTotal.toFixed(2)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(row.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Row and Preset Chips */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      id="add-item-row-btn"
                      onClick={() => handleAddItemRow()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#f97316]" />
                      <span>Add Another Item Row</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-gray-400 font-medium">Quick add:</span>
                      {SARI_SARI_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddItemRow(preset)}
                          className="text-[11px] px-2 py-0.5 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700 rounded-md transition-colors cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., 2 Canned Sardines, 1kg Rice, 3 Sachets Coffee..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f97316] transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Total Credit Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="credit-amount-input"
                  className="block text-sm font-semibold text-gray-800"
                >
                  Credit Amount (Utang) <span className="text-red-500">*</span>
                </label>
                {itemsMode === 'itemized' && numAmount > 0 && (
                  <span className="text-xs text-orange-600 font-semibold">
                    Computed from item prices
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 font-bold text-base">
                  ₱
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="credit-amount-input"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors shadow-2xs font-mono font-medium"
                />
              </div>

              {/* Quick Amount Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 font-medium">Quick amounts:</span>
                {[20, 50, 100, 150, 200, 350].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => {
                      setAmount(presetVal.toFixed(2));
                      if (error) setError('');
                    }}
                    className="text-[11px] px-2 py-1 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-gray-200 text-gray-600 rounded-lg font-mono transition-colors cursor-pointer"
                  >
                    +₱{presetVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Field */}
            <div>
              <label
                htmlFor="transaction-date-input"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="transaction-date-input"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors shadow-2xs cursor-pointer"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Dynamic Feedback Box (Matches Record Payment style) */}
            <div
              id="dynamic-feedback-box"
              className="p-4 rounded-xl border bg-orange-50/70 border-orange-200 text-orange-950 transition-all"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-orange-600" />
                <div className="space-y-0.5">
                  <p id="remaining-balance-text" className="text-sm sm:text-base font-bold">
                    New Total Utang: ₱{projectedBalance.toFixed(2)}
                  </p>
                  <p id="feedback-subtext" className="text-xs text-orange-800/90">
                    Previous utang: <b className="font-mono">₱{currentBalance.toFixed(2)}</b>
                    {numAmount > 0 && (
                      <> + This purchase: <b className="font-mono">₱{numAmount.toFixed(2)}</b></>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                id="cancel-credit-btn"
                onClick={onBack}
                className="py-2.5 px-5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-credit-btn"
                className="py-2.5 px-6 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                <span>Save Credit Transaction</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};