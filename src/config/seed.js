require('dotenv').config();
const { sequelize, User, Product, Lead, Contact, Invoice, InvoiceItem } = require('../models');
const { generateInvoiceNumber } = require('../utils/numberGenerator');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // ─── Users ────────────────────────────────────────────────────────────────
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@leadflow.com' },
      defaults: { name: 'Super Admin', password: 'Admin@123', role: 'admin', phone: '9000000001', is_active: true },
    });
    console.log('✅ Admin:', admin.email);

    const [manager] = await User.findOrCreate({
      where: { email: 'manager@leadflow.com' },
      defaults: { name: 'Sales Manager', password: 'Manager@123', role: 'manager', phone: '9000000002', is_active: true },
    });
    console.log('✅ Manager:', manager.email);

    const [agent1] = await User.findOrCreate({
      where: { email: 'agent1@leadflow.com' },
      defaults: { name: 'Rahul Sharma', password: 'Agent@123', role: 'agent', phone: '9000000003', is_active: true },
    });
    console.log('✅ Agent 1:', agent1.email);

    const [agent2] = await User.findOrCreate({
      where: { email: 'agent2@leadflow.com' },
      defaults: { name: 'Priya Patel', password: 'Agent@123', role: 'agent', phone: '9000000004', is_active: true },
    });
    console.log('✅ Agent 2:', agent2.email);

    // ─── Products ─────────────────────────────────────────────────────────────
    const productData = [
      { name: 'Basic Plan',       code: 'PLAN-BASIC',  price: 999,   tax_rate: 18, category: 'Subscription', unit: 'month',    description: 'Basic CRM plan for small teams' },
      { name: 'Pro Plan',         code: 'PLAN-PRO',    price: 2999,  tax_rate: 18, category: 'Subscription', unit: 'month',    description: 'Pro CRM plan with advanced features' },
      { name: 'Enterprise Plan',  code: 'PLAN-ENT',    price: 9999,  tax_rate: 18, category: 'Subscription', unit: 'month',    description: 'Enterprise plan with unlimited users' },
      { name: 'Setup Fee',        code: 'SVC-SETUP',   price: 5000,  tax_rate: 18, category: 'Service',      unit: 'one-time', description: 'One-time onboarding and setup fee' },
      { name: 'Training Session', code: 'SVC-TRAIN',   price: 3000,  tax_rate: 18, category: 'Service',      unit: 'session',  description: 'Live training session (2 hours)' },
      { name: 'Custom Module',    code: 'DEV-MODULE',  price: 15000, tax_rate: 18, category: 'Development',  unit: 'module',   description: 'Custom feature development' },
      { name: 'Annual Support',   code: 'SVC-SUPPORT', price: 12000, tax_rate: 18, category: 'Service',      unit: 'year',     description: 'Annual technical support contract' },
    ];

    const products = [];
    for (const p of productData) {
      const [product] = await Product.findOrCreate({ where: { code: p.code }, defaults: { ...p, created_by: admin.id } });
      products.push(product);
      console.log('✅ Product:', product.name);
    }

    // ─── Sample Leads ─────────────────────────────────────────────────────────
    const leadsData = [
      {
        title: 'TechCorp CRM Implementation',
        contact_name: 'Amit Verma', contact_email: 'amit@techcorp.in', contact_phone: '9876543210',
        company_name: 'TechCorp Solutions', company_website: 'https://techcorp.in',
        source: 'website', status: 'qualified', priority: 'high',
        estimated_value: 75000, probability: 70,
        city: 'Mumbai', state: 'Maharashtra', country: 'India',
        assigned_to: agent1.id, created_by: admin.id,
      },
      {
        title: 'RetailMax Software Upgrade',
        contact_name: 'Sneha Joshi', contact_email: 'sneha@retailmax.com', contact_phone: '9876543211',
        company_name: 'RetailMax Pvt Ltd', company_website: 'https://retailmax.com',
        source: 'referral', status: 'proposal', priority: 'high',
        estimated_value: 120000, probability: 60,
        city: 'Pune', state: 'Maharashtra', country: 'India',
        assigned_to: agent1.id, created_by: manager.id,
      },
      {
        title: 'StartupHub Subscription',
        contact_name: 'Karan Mehta', contact_email: 'karan@startuphub.io', contact_phone: '9876543212',
        company_name: 'StartupHub', company_website: 'https://startuphub.io',
        source: 'social_media', status: 'new', priority: 'medium',
        estimated_value: 35000, probability: 30,
        city: 'Bangalore', state: 'Karnataka', country: 'India',
        assigned_to: agent2.id, created_by: admin.id,
      },
      {
        title: 'FinanceFirst Annual Contract',
        contact_name: 'Deepa Nair', contact_email: 'deepa@financefirst.in', contact_phone: '9876543213',
        company_name: 'FinanceFirst Ltd', company_website: 'https://financefirst.in',
        source: 'cold_call', status: 'negotiation', priority: 'urgent',
        estimated_value: 200000, probability: 80,
        city: 'Chennai', state: 'Tamil Nadu', country: 'India',
        assigned_to: agent2.id, created_by: manager.id,
      },
      {
        title: 'EduLearn Platform Setup',
        contact_name: 'Rohit Gupta', contact_email: 'rohit@edulearn.org', contact_phone: '9876543214',
        company_name: 'EduLearn Foundation', company_website: 'https://edulearn.org',
        source: 'email', status: 'won', priority: 'medium',
        estimated_value: 55000, probability: 100,
        city: 'Delhi', state: 'Delhi', country: 'India',
        assigned_to: agent1.id, created_by: admin.id,
        actual_close_date: new Date(),
      },
      {
        title: 'HealthPlus CRM Trial',
        contact_name: 'Meera Singh', contact_email: 'meera@healthplus.in', contact_phone: '9876543215',
        company_name: 'HealthPlus Clinics', company_website: 'https://healthplus.in',
        source: 'advertisement', status: 'contacted', priority: 'low',
        estimated_value: 18000, probability: 20,
        city: 'Hyderabad', state: 'Telangana', country: 'India',
        assigned_to: agent2.id, created_by: manager.id,
      },
    ];

    for (const l of leadsData) {
      const [lead, created] = await Lead.findOrCreate({ where: { title: l.title }, defaults: l });
      if (created) {
        // Add a primary contact for each lead
        await Contact.create({
          lead_id: lead.id,
          name: lead.contact_name,
          email: lead.contact_email,
          phone: lead.contact_phone,
          company: lead.company_name,
          is_primary: true,
          created_by: admin.id,
        });
      }
      console.log(`✅ Lead: ${lead.title}`);
    }

    // ─── Report Demo Data (leads + invoices across multiple months) ─────────────
    const monthsAgo = (m) => { const d = new Date(); d.setDate(15); d.setMonth(d.getMonth() - m); return d; };
    const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
    const computeInvoice = (items) => {
      const built = items.map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unit_price) || 0;
        const taxRate = Number(it.tax_rate) || 0;
        const base = qty * price;
        const tax = (base * taxRate) / 100;
        return { name: it.name, unit_price: price, quantity: qty, tax_rate: taxRate, tax_amount: tax, total: base + tax, sort_order: idx };
      });
      const subtotal = built.reduce((s, i) => s + (Number(i.total) - Number(i.tax_amount)), 0);
      const taxAmount = built.reduce((s, i) => s + Number(i.tax_amount), 0);
      const total = subtotal + taxAmount;
      return { built, subtotal, taxAmount, total };
    };

    const reportLeadsData = [
      { title: 'Acme Retail CRM Rollout',   contact_name: 'Vijay Rao',    contact_email: 'vijay@acme.in',     company_name: 'Acme Retail',     source: 'website',      status: 'won',         priority: 'high',   estimated_value: 90000,  probability: 100, city: 'Mumbai',    state: 'Maharashtra', assigned_to: agent1.id, created_by: admin.id, monthsAgo: 8 },
      { title: 'BrightLogistics TMS',        contact_name: 'Anita Desai',  contact_email: 'anita@bright.in',   company_name: 'BrightLogistics', source: 'referral',     status: 'won',         priority: 'high',   estimated_value: 150000, probability: 100, city: 'Pune',      state: 'Maharashtra', assigned_to: agent2.id, created_by: manager.id, monthsAgo: 7 },
      { title: 'CloudNine Hosting Upgrade',  contact_name: 'Suresh Babu',  contact_email: 'suresh@cloud9.io',   company_name: 'CloudNine',       source: 'social_media', status: 'negotiation', priority: 'medium', estimated_value: 60000,  probability: 60,  city: 'Bangalore', state: 'Karnataka',   assigned_to: agent1.id, created_by: admin.id, monthsAgo: 7 },
      { title: 'MedTrust Patient Portal',    contact_name: 'Lakshmi N',    contact_email: 'lakshmi@medtrust.in', company_name: 'MedTrust',      source: 'email',        status: 'proposal',    priority: 'high',   estimated_value: 110000, probability: 55,  city: 'Chennai',   state: 'Tamil Nadu',   assigned_to: agent2.id, created_by: manager.id, monthsAgo: 6 },
      { title: 'ShopEasy Cart Integration',  contact_name: 'Imran Khan',   contact_email: 'imran@shopeasy.in',  company_name: 'ShopEasy',        source: 'advertisement',status: 'won',         priority: 'medium', estimated_value: 45000,  probability: 100, city: 'Delhi',     state: 'Delhi',       assigned_to: agent1.id, created_by: admin.id, monthsAgo: 5 },
      { title: 'FinEdge Wealth App',         contact_name: 'Ritu Agarwal', contact_email: 'ritu@finedge.in',    company_name: 'FinEdge',         source: 'cold_call',    status: 'qualified',   priority: 'high',   estimated_value: 130000, probability: 70,  city: 'Kolkata',   state: 'West Bengal',  assigned_to: agent2.id, created_by: manager.id, monthsAgo: 5 },
      { title: 'GreenField ERP',             contact_name: 'Manoj Tiwari', contact_email: 'manoj@greenfield.in', company_name: 'GreenField',    source: 'event',        status: 'won',         priority: 'urgent', estimated_value: 200000, probability: 100, city: 'Jaipur',    state: 'Rajasthan',    assigned_to: agent1.id, created_by: admin.id, monthsAgo: 4 },
      { title: 'UrbanMart Loyalty',          contact_name: 'Neha Kapoor',  contact_email: 'neha@urbanmart.in',  company_name: 'UrbanMart',       source: 'website',      status: 'contacted',   priority: 'low',    estimated_value: 25000,  probability: 25,  city: 'Hyderabad', state: 'Telangana',    assigned_to: agent2.id, created_by: manager.id, monthsAgo: 3 },
      { title: 'TravelYo Booking Engine',    contact_name: 'Arjun Nair',   contact_email: 'arjun@travely.io',   company_name: 'TravelYo',        source: 'referral',     status: 'won',         priority: 'medium', estimated_value: 80000,  probability: 100, city: 'Kochi',     state: 'Kerala',       assigned_to: agent1.id, created_by: admin.id, monthsAgo: 3 },
      { title: 'FoodieHub POS',              contact_name: 'Pooja Reddy',  contact_email: 'pooja@foodiehub.in', company_name: 'FoodieHub',       source: 'social_media', status: 'proposal',    priority: 'medium', estimated_value: 50000,  probability: 50,  city: 'Ahmedabad', state: 'Gujarat',      assigned_to: agent2.id, created_by: manager.id, monthsAgo: 2 },
      { title: 'SecurePay Gateway',          contact_name: 'Kabir Singh',   contact_email: 'kabir@securepay.in', company_name: 'SecurePay',      source: 'email',        status: 'won',         priority: 'high',   estimated_value: 170000, probability: 100, city: 'Gurgaon',   state: 'Haryana',      assigned_to: agent1.id, created_by: admin.id, monthsAgo: 1 },
      { title: 'BuildWell CRM',              contact_name: 'Sara Thomas',   contact_email: 'sara@buildwell.in', company_name: 'BuildWell',       source: 'advertisement',status: 'new',         priority: 'low',    estimated_value: 30000,  probability: 10,  city: 'Lucknow',   state: 'Uttar Pradesh', assigned_to: agent2.id, created_by: manager.id, monthsAgo: 0 },
    ];

    const lastReportTitle = reportLeadsData[reportLeadsData.length - 1].title;
    const alreadySeeded = await Lead.findOne({ where: { title: lastReportTitle } });
    if (alreadySeeded) {
      console.log('ℹ️  Report demo data already present, skipping');
    } else {
      const createdReportLeads = [];
      for (const l of reportLeadsData) {
        const createdAt = monthsAgo(l.monthsAgo);
        const { monthsAgo: _drop, ...leadFields } = l;
        const defaults = { ...leadFields, createdAt, updatedAt: createdAt };
        if (l.status === 'won') defaults.actual_close_date = createdAt;
        const [lead] = await Lead.findOrCreate({
          where: { title: l.title },
          defaults,
        });
        createdReportLeads.push(lead);
        await Contact.findOrCreate({
          where: { lead_id: lead.id, email: lead.contact_email },
          defaults: { lead_id: lead.id, name: lead.contact_name, email: lead.contact_email, phone: lead.contact_phone, company: lead.company_name, is_primary: true, created_by: admin.id },
        });
        console.log(`✅ Report Lead: ${lead.title} (${createdAt.toISOString().slice(0, 7)})`);
      }

      const invoiceSpecs = [
        { title: 'Acme Retail CRM Rollout',  monthsAgo: 8, status: 'paid',    paidRatio: 1,   items: [{ name: 'Enterprise Plan', unit_price: 9999, quantity: 2, tax_rate: 18 }, { name: 'Setup Fee', unit_price: 5000, quantity: 1, tax_rate: 18 }] },
        { title: 'BrightLogistics TMS',       monthsAgo: 7, status: 'paid',    paidRatio: 1,   items: [{ name: 'Enterprise Plan', unit_price: 9999, quantity: 3, tax_rate: 18 }, { name: 'Annual Support', unit_price: 12000, quantity: 1, tax_rate: 18 }] },
        { title: 'CloudNine Hosting Upgrade', monthsAgo: 7, status: 'sent',    paidRatio: 0,   items: [{ name: 'Pro Plan', unit_price: 2999, quantity: 8, tax_rate: 18 }] },
        { title: 'MedTrust Patient Portal',   monthsAgo: 6, status: 'draft',   paidRatio: 0,   items: [{ name: 'Custom Module', unit_price: 15000, quantity: 1, tax_rate: 18 }, { name: 'Training Session', unit_price: 3000, quantity: 2, tax_rate: 18 }] },
        { title: 'ShopEasy Cart Integration', monthsAgo: 5, status: 'paid',    paidRatio: 1,   items: [{ name: 'Pro Plan', unit_price: 2999, quantity: 5, tax_rate: 18 }, { name: 'Setup Fee', unit_price: 5000, quantity: 1, tax_rate: 18 }] },
        { title: 'FinEdge Wealth App',        monthsAgo: 5, status: 'sent',    paidRatio: 0,   items: [{ name: 'Enterprise Plan', unit_price: 9999, quantity: 2, tax_rate: 18 }] },
        { title: 'GreenField ERP',            monthsAgo: 4, status: 'partial', paidRatio: 0.5, items: [{ name: 'Enterprise Plan', unit_price: 9999, quantity: 4, tax_rate: 18 }, { name: 'Annual Support', unit_price: 12000, quantity: 1, tax_rate: 18 }] },
        { title: 'UrbanMart Loyalty',         monthsAgo: 3, status: 'overdue', paidRatio: 0,   items: [{ name: 'Basic Plan', unit_price: 999, quantity: 10, tax_rate: 18 }] },
        { title: 'TravelYo Booking Engine',   monthsAgo: 3, status: 'paid',    paidRatio: 1,   items: [{ name: 'Pro Plan', unit_price: 2999, quantity: 12, tax_rate: 18 }, { name: 'Setup Fee', unit_price: 5000, quantity: 1, tax_rate: 18 }] },
        { title: 'FoodieHub POS',             monthsAgo: 2, status: 'sent',    paidRatio: 0,   items: [{ name: 'Pro Plan', unit_price: 2999, quantity: 6, tax_rate: 18 }] },
        { title: 'SecurePay Gateway',         monthsAgo: 1, status: 'paid',    paidRatio: 1,   items: [{ name: 'Enterprise Plan', unit_price: 9999, quantity: 3, tax_rate: 18 }, { name: 'Custom Module', unit_price: 15000, quantity: 1, tax_rate: 18 }] },
      ];

      for (const spec of invoiceSpecs) {
        const lead = createdReportLeads.find(l => l.title === spec.title);
        if (!lead) continue;
        const issueDate = monthsAgo(spec.monthsAgo);
        const { built, subtotal, taxAmount, total } = computeInvoice(spec.items);
        const paid = Math.round(total * spec.paidRatio * 100) / 100;
        const balance = Math.round((total - paid) * 100) / 100;
        const invoiceNumber = await generateInvoiceNumber();
        const [inv] = await Invoice.findOrCreate({
          where: { invoice_number: invoiceNumber },
          defaults: {
            lead_id: lead.id, created_by: lead.assigned_to, quotation_id: null,
            invoice_number: invoiceNumber, title: spec.title,
            status: spec.status,
            issue_date: issueDate, due_date: addDays(issueDate, 30),
            subtotal, discount_type: 'percentage', discount_value: 0, discount_amount: 0,
            tax_amount: taxAmount, total, paid_amount: paid, balance_due: balance,
            currency: 'INR',
            payment_method: spec.paidRatio > 0 ? 'bank_transfer' : null,
            payment_date: spec.paidRatio > 0 ? issueDate : null,
          },
        });
        await InvoiceItem.bulkCreate(built.map(i => ({ ...i, invoice_id: inv.id, description: '', unit: 'piece' })));
        console.log(`✅ Invoice: ${invoiceNumber} (${issueDate.toISOString().slice(0, 7)}) - ${spec.status}`);
      }
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('─────────────────────────────────────────');
    console.log('  Login Credentials');
    console.log('─────────────────────────────────────────');
    console.log('  Admin   → admin@leadflow.com   / Admin@123');
    console.log('  Manager → manager@leadflow.com / Manager@123');
    console.log('  Agent 1 → agent1@leadflow.com  / Agent@123');
    console.log('  Agent 2 → agent2@leadflow.com  / Agent@123');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
