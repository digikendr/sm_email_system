<template>
  <div class="app-container">
    <header>
      <div class="brand">
        <span class="mark">Sugandh Mart</span>
        <span class="sub">Counter &amp; Ledger</span>
      </div>
      <div class="spacer"></div>
      
      <div class="header-controls">
        <div class="ctrl">
          <button @click="currentView = 'home'" class="dashboard-link" style="background:transparent;cursor:pointer;">
            Home
          </button>
        </div>
        <div class="ctrl" v-if="currentView === 'dashboard'">
          <button @click="logout" class="dashboard-link" style="background:transparent;cursor:pointer;color:#f0d9a8;border-color:#9c4a3c;">
            Log Out
          </button>
        </div>
        <div class="ctrl" v-else-if="currentView === 'counter'">
          <button @click="logoutShopkeeper" class="dashboard-link" style="background:transparent;cursor:pointer;color:#f0d9a8;border-color:#9c4a3c;">
            Log Out
          </button>
        </div>
        <div class="ctrl">
          <label>Store</label>
          <select v-model="store" :disabled="currentView === 'counter'">
            <option>SM1 — Thane</option>
            <option>SM2 — Mulund</option>
            <option>SM Online</option>
          </select>
        </div>
        <div class="ctrl">
          <label>Date</label>
          <input type="date" v-model="date">
        </div>

      </div>
    </header>

    <div v-if="currentView === 'home'" class="home-view">
      <div class="home-container">
        <div class="home-brand">
          <h1 class="serif">Sugandh Mart</h1>
          <p>Centralized Ledger &amp; Billing System</p>
        </div>
        
        <div class="portal-cards">
          <div class="portal-card shopkeeper" @click="goToShopkeeper">
            <div class="portal-icon">🏪</div>
            <h3>Shopkeeper Portal</h3>
            <p>Access the billing counter to create and dispatch purchase orders seamlessly up the supply chain.</p>
            <div class="portal-arrow">→</div>
          </div>
          
          <div class="portal-card admin" @click="goToAdmin">
            <div class="portal-icon">🔒</div>
            <h3>Admin Portal</h3>
            <p>View the unified ledger dashboard, monitor sales analytics, and manage chain invoices.</p>
            <div class="portal-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- Password Modal -->
      <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
        <div class="modal-content">
          <h3>Admin Login</h3>
          <p>Please enter the admin password to continue</p>
          <input type="password" v-model="passwordInput" placeholder="Enter Password" @keyup.enter="verifyPassword">
          <div v-if="passwordError" class="error-text">{{ passwordError }}</div>
          <div class="modal-actions">
            <button @click="closePasswordModal" class="btn-cancel">Cancel</button>
            <button @click="verifyPassword" class="btn-verify">Verify</button>
          </div>
        </div>
      </div>

      <!-- Shopkeeper Login Modal -->
      <div v-if="showShopkeeperModal" class="modal-overlay" @click.self="closeShopkeeperModal">
        <div class="modal-content">
          <h3>Shopkeeper Login</h3>
          <p>Select your store and enter password</p>
          <select v-model="store" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink); box-sizing:border-box">
            <option>SM1 — Thane</option>
            <option>SM2 — Mulund</option>
            <option>SM Online</option>
          </select>
          <input type="password" v-model="shopkeeperPasswordInput" placeholder="Enter Password" @keyup.enter="verifyShopkeeperPassword">
          <div v-if="shopkeeperError" class="error-text">{{ shopkeeperError }}</div>
          <div class="modal-actions">
            <button @click="closeShopkeeperModal" class="btn-cancel">Cancel</button>
            <button @click="verifyShopkeeperPassword" class="btn-verify">Login</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="currentView === 'counter'">
      <div class="dash-tabs" style="margin-bottom: 0; padding-top: 15px; padding-left: 20px; background: var(--paper); border-bottom: 1px solid var(--e8dec8); display: flex; gap: 15px;">
        <button :class="{active: shopkeeperTab === 'counter'}" @click="shopkeeperTab = 'counter'">Billing Counter</button>
        <button :class="{active: shopkeeperTab === 'history'}" @click="fetchShopkeeperHistory(); shopkeeperTab = 'history'">Bill History</button>
      </div>

      <div v-if="shopkeeperTab === 'counter'" class="wrap" style="height: calc(100vh - 140px); border-top: none;">
      <!-- LEFT SIDEBAR: Entry & Cart -->
      <section class="entry">
        <div class="entry-head">
          <h2>Add what sold</h2>
          <p>Search a product, set quantity. The ledger builds itself.</p>
        </div>
        
        <div class="search-box">
          <span class="ico">⌕</span>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search 262 products…" 
            autocomplete="off"
            @keydown.down.prevent="moveActiveRes(1)"
            @keydown.up.prevent="moveActiveRes(-1)"
            @keydown.enter.prevent="addActiveRes"
            @keydown.esc="searchQuery = ''"
          >
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
            <div style="font-size:12px; font-weight:700; color:#8a7a60; text-transform:uppercase; letter-spacing:0.5px">Catalog</div>
            <div style="display:flex;gap:6px">
              <button class="pill" :class="{ SADVIK: activeFilter === 'SADVIK' }" @click="activeFilter = activeFilter === 'SADVIK' ? null : 'SADVIK'" :style="activeFilter !== 'SADVIK' ? 'cursor:pointer;border:1px solid #d8cbb0;background:transparent;color:#8a7a60' : 'cursor:pointer;border:1px solid transparent'">Sadvik</button>
              <button class="pill" :class="{ ALEITR: activeFilter === 'ALEITR' }" @click="activeFilter = activeFilter === 'ALEITR' ? null : 'ALEITR'" :style="activeFilter !== 'ALEITR' ? 'cursor:pointer;border:1px solid #d8cbb0;background:transparent;color:#8a7a60' : 'cursor:pointer;border:1px solid transparent'">Al Eitr</button>
              <button class="pill" :class="{ DIRECT: activeFilter === 'DIRECT' }" @click="activeFilter = activeFilter === 'DIRECT' ? null : 'DIRECT'" :style="activeFilter !== 'DIRECT' ? 'cursor:pointer;border:1px solid #d8cbb0;background:transparent;color:#8a7a60' : 'cursor:pointer;border:1px solid transparent'">Direct</button>
            </div>
          </div>
          <div class="results" :class="{ show: matches.length > 0 }">
            <div 
              v-for="(p, index) in matches" 
              :key="p.id"
              class="res-item"
              :class="{ active: index === activeRes }"
              @click="addItem(p.id)"
            >
              <div>
                <div class="nm">{{ p.name }}</div>
                <div class="meta">
                  {{ p.cat }}<template v-if="p.wt"> · {{ p.wt }}g</template>
                </div>
              </div>
              <span class="pill" :class="p.route">{{ getCompanyShort(p.route) }}</span>
            </div>
          </div>
        </div>

        <!-- Cart items list -->
        <div style="padding: 10px 18px 0px 18px; font-size:12px; font-weight:700; color:#8a7a60; text-transform:uppercase; letter-spacing:0.5px; border-top: 1px solid #e8dec8;">Cart ({{ totalUnits }} units)</div>
        <div class="cart">
          <div v-if="cart.length === 0" class="cart-empty">
            <div class="big serif">۞</div>
            Nothing added yet.<br>Search above to start a sale.
          </div>
          
          <div v-else>
            <div v-for="c in cart" :key="c.id" class="ci">
              <div class="top">
                <div>
                  <div class="nm">{{ getProduct(c.id).name }}</div>
                  <div class="meta">
                    {{ getProduct(c.id).cat }}
                    <template v-if="getProduct(c.id).wt"> · {{ getProduct(c.id).wt }}g</template>
                    <span class="pill" :class="getProduct(c.id).route" style="margin-left:4px">
                      {{ getProduct(c.id).route }}
                    </span>
                  </div>
                </div>
                <button class="rm" title="Remove" @click="removeItem(c.id)">✕</button>
              </div>
              <div class="qtyrow">
                <div class="qstep">
                  <button @click="setQty(c.id, c.qty - 1)">−</button>
                  <input type="number" min="1" :value="c.qty" @change="setQty(c.id, +$event.target.value)">
                  <button @click="setQty(c.id, c.qty + 1)">+</button>
                </div>
                <div class="lt">
                  <!-- Prices hidden for shopkeeper -->
                </div>
              </div>
            </div>

            <!-- Send Invoices Button -->
            <button 
              class="send-btn" 
              id="sendInvoicesBtn" 
              :disabled="sending" 
              @click="sendInvoices"
            >
              {{ sending ? 'Sending...' : 'Send Invoices' }}
            </button>
          </div>
        </div>
      </section>

      <!-- RIGHT PANE: Invoices -->
      <section class="stage">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab active" :class="{ has: cart.length > 0 }">
            <span class="dot"></span>
            Customer Bill
            <span v-if="cart.length > 0" class="cnt">{{ cart.length }}</span>
          </button>
        </div>

        <!-- Render active tab details -->
        <div class="invoice-scroll">
          <div class="summary-view">
            <div v-if="cart.length === 0" class="empty-inv">
              <div class="big serif">۞</div>
              The customer bill appears here once you add items.
            </div>
            
            <div v-else class="summary">
              <div class="sgrid">
                <div class="scard"><div class="k">Items</div><div class="v">{{ cart.length }}</div></div>
                <div class="scard"><div class="k">Units sold</div><div class="v">{{ totalUnits }}</div></div>
                <div class="scard"><div class="k">Linked invoices</div><div class="v">{{ linkedInvoicesCount }}</div></div>
              </div>
              
              <div style="display:flex; justify-content:flex-end; margin-bottom:14px">
                <button class="printbtn" @click="printWindow">Print customer bill</button>
              </div>
              
              <div class="inv">
                <div class="inv-band">
                  <div>
                    <div class="from">Sugandh Mart</div>
                    <div class="arrow">▾ retail bill</div>
                    <div class="to">Customer</div>
                  </div>
                  <div class="rt">
                    Bill <b>{{ getInvoiceNo('client') }}</b><br>
                    Date <b>{{ fmtDate }}</b><br>
                    Store <b>{{ store }}</b>
                  </div>
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th style="width:34px">#</th>
                      <th>Item</th>
                      <th class="r">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in clientRows" :key="i">
                      <td>{{ i + 1 }}</td>
                      <td class="desc">
                        {{ r.name }}<small>{{ r.cat }}<template v-if="r.wt"> · {{ r.wt }}g</template></small>
                      </td>
                      <td class="r">{{ r.qty }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="flowline">
                Supply chain breakdown: {{ routeCount('SADVIK') }} via Sadvik · {{ routeCount('ALEITR') }} via Al Eitr · {{ routeCount('DIRECT') }} direct from SIPL — all billed up the chain automatically.
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div v-if="shopkeeperTab === 'history'" class="dashboard-wrap" style="height: calc(100vh - 140px); overflow-y: auto;">
        <div class="container">
          <h2 style="font-family:Georgia,serif; color:var(--ink); margin-bottom:20px;">Store Bill History</h2>
          
          <div class="dash-tabs" style="margin-bottom: 20px; padding: 0;">
            <button :class="{active: shopkeeperHistoryTab === 'open'}" @click="shopkeeperHistoryTab = 'open'">Open Bills</button>
            <button :class="{active: shopkeeperHistoryTab === 'closed'}" @click="shopkeeperHistoryTab = 'closed'">Closed Bills</button>
          </div>

          <div v-if="shopkeeperHistoryLoading" style="text-align:center; padding:40px; color:#8a7a60">
            Loading your store history...
          </div>
          <div v-else class="sales-list">
            <div v-if="(shopkeeperHistoryTab === 'open' ? shopkeeperOpenBills : shopkeeperClosedBills).length === 0" style="background:var(--paper2); border:1px dashed var(--line); border-radius:12px; padding:60px 20px; text-align:center; color:var(--muted)">
              <div style="font-family:Georgia,serif; font-size:40px; margin-bottom:10px;">۞</div>
              No {{ shopkeeperHistoryTab }} sales recorded.
            </div>
            
            <div v-for="sale in (shopkeeperHistoryTab === 'open' ? shopkeeperOpenBills : shopkeeperClosedBills)" :key="sale.id" class="sale-card" style="margin-bottom: 15px; border: 1px solid var(--e8dec8); border-radius: 8px; padding: 15px; background: #fff; transition: box-shadow 0.2s;">
              <!-- Header Summary (Always Visible) -->
              <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" @click="expandedSaleId = expandedSaleId === sale.id ? null : sale.id">
                <div>
                  <h3 style="margin: 0; font-family: Georgia, serif; color: var(--ink); font-size: 16px;">Retail Bill #{{ sale.id }}</h3>
                  <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">{{ formatDateDash(sale.created_at) }}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="font-weight: 600; font-size: 16px;">{{ formatINR(sale.customer_total) }}</div>
                  <button class="btn-download" style="padding: 6px 12px; cursor: pointer; border: 1px solid var(--line); background: var(--paper2); border-radius: 4px; font-weight: 600;">
                    {{ expandedSaleId === sale.id ? 'Hide Details' : 'View Details' }}
                  </button>
                </div>
              </div>

              <!-- Expanded Details Section -->
              <div v-if="expandedSaleId === sale.id" style="margin-top: 20px; border-top: 1px dashed var(--d8cbb0); padding-top: 20px; display: grid; grid-template-columns: minmax(280px, 1fr) 2fr; gap: 20px; align-items: start;">
                <!-- Left Column: Items Checkboxes -->
                <div>
                  <h4 style="margin: 0 0 10px 0; font-size: 13px; color: var(--ink); text-transform: uppercase;">Pack Items</h4>
                  <div v-if="sale.products && sale.products.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
                    <label v-for="(prod, i) in sale.products" :key="i" style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; padding: 8px; border: 1px solid var(--e8dec8); border-radius: 4px; background: var(--paper2); transition: background 0.2s;">
                      <input type="checkbox" :checked="(sale.checked_items || []).includes(prod.product_name)" @change="toggleShopkeeperItem(sale.id, prod.product_name)" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--amber);">
                      <span :style="{ textDecoration: (sale.checked_items || []).includes(prod.product_name) ? 'line-through' : 'none', color: (sale.checked_items || []).includes(prod.product_name) ? 'var(--muted)' : 'var(--ink)' }">
                        {{ prod.product_name }} <span v-if="prod.weight" style="color:var(--muted); font-size:11px;">({{ prod.weight }})</span>
                        - <strong :style="{ color: (sale.checked_items || []).includes(prod.product_name) ? 'var(--muted)' : 'var(--ink)' }">{{ prod.qty }} qty</strong>
                      </span>
                    </label>
                  </div>
                  <div v-else style="font-size: 12px; color: var(--muted); font-style: italic;">No items found.</div>
                  
                  <!-- Manual Complete Button -->
                  <div style="margin-top: 15px;">
                    <button v-if="sale.status === 'open'" @click="updateSaleStatus(sale.id, 'closed')" style="width: 100%; padding: 10px; background: #3f7a4d; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                      Complete Order & Close Bill
                    </button>
                    <button v-else @click="updateSaleStatus(sale.id, 'open')" style="width: 100%; padding: 10px; background: var(--paper2); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                      Re-open Bill
                    </button>
                  </div>
                </div>

                <!-- Right Column: Supply Chain Timeline -->
                <div>
                  <h4 style="margin: 0 0 10px 0; font-size: 13px; color: var(--ink); text-transform: uppercase;">Linked Chain Invoices Timeline</h4>
                  <div v-if="sale.invoices && sale.invoices.length > 0">
                    <table class="stat-table" style="width: 100%; font-size: 13px; margin: 0; background: #fff; border: 1px solid var(--e8dec8); border-radius: 6px; overflow: hidden; border-spacing: 0;">
                      <thead style="background: #fbf5eb;">
                        <tr>
                          <th style="padding: 10px 15px; text-align: left; border-bottom: 1px solid var(--e8dec8);">Chain Route</th>
                          <th style="padding: 10px 15px; text-align: left; border-bottom: 1px solid var(--e8dec8);">Invoice Ref</th>
                          <th style="padding: 10px 15px; text-align: left; border-bottom: 1px solid var(--e8dec8);">Action Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="inv in sale.invoices" :key="inv.id">
                          <td style="font-weight:600; padding: 10px 15px; border-bottom: 1px solid var(--e8dec8);">{{ inv.from_entity }} → {{ inv.to_entity }}</td>
                          <td style="font-family:monospace; color:var(--muted); padding: 10px 15px; border-bottom: 1px solid var(--e8dec8);">{{ inv.invoice_number }}</td>
                          <td style="padding: 10px 15px; border-bottom: 1px solid var(--e8dec8);">
                            <span v-if="inv.status === 'accepted'" style="color:#3f7a4d; font-weight:600;">Accepted</span>
                            <span v-else-if="inv.status === 'rejected'" style="color:#9c4a3c; font-weight:600;">Rejected</span>
                            <span v-else style="color:#b7791f; font-weight:600;">Awaiting Action</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else style="font-size:12px; color:var(--muted); font-style:italic; margin: 0;">No linked invoices generated up the chain for this sale.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="currentView === 'dashboard'" class="dashboard-wrap">
      <div class="container">
        
        <div class="dash-tabs">
          <button :class="{active: dashTab === 'sales'}" @click="dashTab = 'sales'">Sales & Invoices</button>
          <button :class="{active: dashTab === 'stats'}" @click="dashTab = 'stats'">Overview & Stats</button>
          <button :class="{active: dashTab === 'reports'}" @click="dashTab = 'reports'; fetchReports(); fetchChartData(); fetchAcceptanceTrend();">Graphs & Reports</button>
          <button :class="{active: dashTab === 'products'}" @click="dashTab = 'products'">Products Catalog</button>
        </div>

        <div v-if="dashTab === 'stats'" class="stats-section">
          <div v-if="statsLoading" style="text-align:center; padding:40px; color:#8a7a60">Loading stats...</div>
          <div v-else-if="statsError" style="text-align:center; padding:40px; color:#9c4a3c">{{ statsError }}</div>
          <div v-else-if="statsData">
            <div class="metrics">
              <div class="metric-card">
                <div class="title">Total Sales (This Month)</div>
                <div class="value">{{ formatINR(statsData.totalSalesThisMonth) }}</div>
                <div class="delta" v-if="statsData.deltas" :class="getDeltaClass(statsData.deltas.sales)">
                  {{ getDeltaText(statsData.deltas.sales) }} vs last month
                </div>
              </div>
              <div class="metric-card">
                <div class="title">Total Invoices</div>
                <div class="value">{{ statsData.totalInvoices }}</div>
                <div class="delta" v-if="statsData.deltas" :class="getDeltaClass(statsData.deltas.invoices)">
                  {{ getDeltaText(statsData.deltas.invoices) }} this month vs last
                </div>
              </div>
              <div class="metric-card">
                <div class="title">Acceptance Rate</div>
                <div class="value">{{ statsData.acceptanceRate }}%</div>
                <div class="delta" v-if="statsData.deltas" :class="getDeltaClass(statsData.deltas.acceptanceRate)">
                  {{ getDeltaText(statsData.deltas.acceptanceRate, true) }} vs last month
                </div>
              </div>
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                  <h3 style="margin:0">Sales by Route</h3>
                  <button v-if="selectedRoute" @click="toggleRoute(selectedRoute)" style="background:none; border:none; color:var(--rose); font-size:11px; cursor:pointer; text-decoration:underline; font-weight:600;">Reset Filter</button>
                </div>
                <table class="stat-table">
                  <thead>
                    <tr><th>Route</th><th style="text-align:right">Total Amount</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="route in statsData.routeBreakdown" :key="route.from_entity"
                        @click="toggleRoute(route.from_entity)"
                        :class="{'selected-row': selectedRoute === route.from_entity}"
                        style="cursor:pointer; transition: background 0.2s;">
                      <td>{{ route.from_entity }}</td>
                      <td style="text-align:right">{{ formatINR(route.total_amount) }}</td>
                    </tr>
                    <tr v-if="!statsData.routeBreakdown || statsData.routeBreakdown.length === 0">
                      <td colspan="2" style="text-align:center;color:var(--muted)">No data available</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="stat-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                  <h3 style="margin:0">Top 5 Products</h3>
                  <div class="toggle-sm">
                    <button :class="{ on: topProductsSort === 'qty' }" @click="setTopProductsSort('qty')">Qty</button>
                    <button :class="{ on: topProductsSort === 'revenue' }" @click="setTopProductsSort('revenue')">Rev</button>
                  </div>
                </div>
                <table class="stat-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style="text-align:right" v-if="topProductsSort === 'qty'">Total Qty</th>
                      <th style="text-align:right" v-if="topProductsSort === 'revenue'">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="prod in statsData.topProducts" :key="prod.product_name">
                      <td>{{ prod.product_name }}</td>
                      <td style="text-align:right" v-if="topProductsSort === 'qty'">{{ formatQty(prod.total_qty) }}</td>
                      <td style="text-align:right" v-if="topProductsSort === 'revenue'">{{ formatINR(prod.total_revenue) }}</td>
                    </tr>
                    <tr v-if="!statsData.topProducts || statsData.topProducts.length === 0">
                      <td colspan="2" style="text-align:center;color:var(--muted)">No data available</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-if="dashTab === 'reports'" class="reports-section" style="display:flex; gap:30px; margin-top:20px; align-items:flex-start; flex-wrap:wrap">
          
          <!-- LEFT COLUMN: Generation and Archives -->
          <div style="flex: 1; min-width:350px; display:flex; flex-direction:column; gap:30px;">
            <div class="reports-controls" style="background:var(--paper2); border:1px solid var(--e8dec8); padding:20px; border-radius:8px">
              <h3 style="font-family:Georgia,serif; font-size:18px; color:var(--ink); margin-bottom:15px">Generate Analytics Report</h3>
              <div style="display:flex; flex-direction:column; gap:15px;">
                <div>
                  <label style="display:block; font-size:12px; color:var(--8a7a60); font-weight:600; text-transform:uppercase; margin-bottom:5px">Type</label>
                  <select v-model="reportType" style="width:100%; padding:10px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink); box-sizing:border-box">
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                  </select>
                </div>
                <div>
                  <label v-if="reportType === 'daily'" style="display:block; font-size:12px; color:var(--8a7a60); font-weight:600; text-transform:uppercase; margin-bottom:5px">Target Date</label>
                  <label v-else-if="reportType === 'weekly'" style="display:block; font-size:12px; color:var(--8a7a60); font-weight:600; text-transform:uppercase; margin-bottom:5px">Target Week</label>
                  <label v-else-if="reportType === 'monthly'" style="display:block; font-size:12px; color:var(--8a7a60); font-weight:600; text-transform:uppercase; margin-bottom:5px">Target Month</label>
                  
                  <input v-if="reportType === 'daily'" type="date" v-model="reportDate" style="width:100%; padding:10px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink); box-sizing:border-box">
                  <input v-else-if="reportType === 'weekly'" type="week" v-model="reportWeek" style="width:100%; padding:10px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink); box-sizing:border-box">
                  <input v-else-if="reportType === 'monthly'" type="month" v-model="reportMonth" style="width:100%; padding:10px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink); box-sizing:border-box">
                </div>
                <div style="display:flex; gap:10px; margin-top:10px;">
                  <select v-model="exportFormat" style="flex:1; padding:10px; border:1px solid var(--line); border-radius:6px; background:#fff; color:var(--ink); font-weight:500;">
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="xls">Excel Spreadsheet (.xls)</option>
                    <option value="csv">CSV File (.csv)</option>
                  </select>
                  <button @click="handleExport" :disabled="generatingReport" style="flex:1; padding:11px 0; background:var(--ink); color:var(--f0d9a8); border:none; border-radius:6px; font-weight:600; cursor:pointer; text-align:center;">
                    {{ generatingReport ? 'Wait...' : 'Download Report' }}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 style="font-family:Georgia,serif; font-size:18px; color:var(--ink); margin-bottom:15px">Report History</h3>
              <div v-if="reportsLoading" style="color:var(--8a7a60)">Loading reports...</div>
              <div v-else style="background:#fff; border:1px solid var(--e8dec8); border-radius:8px; overflow:hidden">
                <table class="stat-table" style="width:100%; margin:0; border:none">
                  <thead style="background:#fbf5eb">
                    <tr>
                      <th style="border:none">Type</th>
                      <th style="border:none">Date Reference</th>
                      <th style="text-align:right; border:none">Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in reportsList" :key="r.id">
                      <td style="text-transform:capitalize; font-weight:600">{{ r.report_type }}</td>
                      <td>{{ r.report_date.split('T')[0] }}</td>
                      <td style="text-align:right">
                        <button @click="downloadArchived('xls', r.report_type, r.report_date.split('T')[0])" style="background:none; border:none; color:#3f7a4d; font-weight:600; cursor:pointer; font-size:12px; margin-right:8px; padding:0;">XLS</button>
                        <button @click="downloadArchived('csv', r.report_type, r.report_date.split('T')[0])" style="background:none; border:none; color:#2b2018; font-weight:600; cursor:pointer; font-size:12px; margin-right:8px; padding:0;">CSV</button>
                        <a :href="r.file_path" target="_blank" style="display:inline-block; padding:4px 10px; background:#f4ece0; color:#8a7a60; text-decoration:none; border-radius:4px; font-size:11px; font-weight:600">PDF</a>
                      </td>
                    </tr>
                    <tr v-if="reportsList.length === 0">
                      <td colspan="3" style="text-align:center; padding:30px; color:var(--8a7a60)">No archived reports available.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Graphs -->
          <div style="flex: 2; min-width:400px; display:flex; flex-direction:column; gap:30px;">
            <div class="stat-box" style="background:var(--paper2); padding:20px; border:1px solid var(--e8dec8); border-radius:8px">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                <h3 style="font-family:Georgia,serif; font-size:18px; color:var(--ink); margin:0">Sales Trend</h3>
                <div style="display:flex; gap:10px">
                  <select v-model="chartFilter" @change="fetchChartData" style="padding:6px 10px; border:1px solid var(--d8cbb0); border-radius:4px; background:#fff; color:var(--ink); font-size:12px;">
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>
              </div>
              <canvas id="salesChart" height="200"></canvas>
            </div>
            
            <div class="stat-box" style="background:var(--paper2); padding:20px; border:1px solid var(--e8dec8); border-radius:8px">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                <h3 style="font-family:Georgia,serif; font-size:18px; color:var(--ink); margin:0">Acceptance Rate Trend</h3>
              </div>
              <canvas id="acceptanceChart" height="200"></canvas>
            </div>
          </div>
        </div>

        <div v-if="dashTab === 'sales'">
          <div class="metrics">
            <div class="metric-card">
              <div class="title">Total Customer Sales</div>
              <div class="value">{{ formatINR(dashboardData?.metrics?.totalSalesVal || 0) }}</div>
            </div>
            <div class="metric-card">
              <div class="title">Chain Invoices</div>
              <div class="value">{{ dashboardData?.metrics?.invoiceCount || 0 }}</div>
            </div>
            <div class="metric-card">
              <div class="title">Accepted Invoices</div>
              <div class="value">
                {{ dashboardData?.metrics?.acceptedCount || 0 }}
                <span style="font-size:14px; font-weight:400; color:var(--muted)">
                  ({{ dashboardData?.metrics?.completionRate || 0 }}%)
                </span>
              </div>
            </div>
            <div class="metric-card">
              <div class="title">Pending Acceptance</div>
              <div class="value" style="color:#b7791f">{{ dashboardData?.metrics?.pendingCount || 0 }}</div>
            </div>
          </div>

          <div v-if="dashboardLoading" style="text-align:center; padding:40px; color:#8a7a60">
            Loading dashboard data...
          </div>
          <div v-else-if="dashboardError" style="text-align:center; padding:40px; color:#9c4a3c">
            {{ dashboardError }}
          </div>
          
          <div v-else class="sales-list">
            <div v-if="!dashboardData?.sales?.length" style="background:var(--paper2); border:1px dashed var(--line); border-radius:12px; padding:60px 20px; text-align:center; color:var(--muted)">
              <div style="font-family:Georgia,serif; font-size:40px; margin-bottom:10px;">۞</div>
              No sales recorded yet. Use the billing counter to create invoices.
            </div>
            
            <div v-for="sale in dashboardData.sales" :key="sale.id" class="sale-card">
              <div class="sale-header">
                <div>
                  <div class="sale-title">{{ sale.store }}</div>
                  <div class="sale-meta">Billing Date: {{ formatDateDash(sale.date).split(' ')[0] }} | Logged: {{ formatDateDash(sale.created_at) }}</div>
                </div>
                <div class="sale-total">
                  {{ formatINR(sale.customer_total) }}
                  <small>customer total</small>
                </div>
              </div>
              
              <table v-if="sale.invoices && sale.invoices.length > 0">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Invoice Number</th>
                    <th>Grand Total</th>
                    <th>Acceptance Status</th>
                    <th style="text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in sale.invoices" :key="inv.id">
                    <td style="font-weight: 600;">{{ inv.from_entity }} → {{ inv.to_entity }}</td>
                    <td style="font-family: monospace; font-weight: 600;">{{ inv.invoice_number }}</td>
                    <td style="font-weight: 600;">{{ formatINR(inv.grand_total) }}</td>
                    <td>
                      <span class="badge" :class="inv.status">{{ inv.status }}</span>
                      <span v-if="inv.status === 'accepted' && inv.accepted_at" class="timestamp">Accepted: {{ formatDateDash(inv.accepted_at) }}</span>
                      <span v-else-if="inv.status === 'rejected' && inv.rejected_at" class="timestamp">Rejected: {{ formatDateDash(inv.rejected_at) }}</span>
                      <span v-else-if="inv.emailed_at" class="timestamp">Emailed: {{ formatDateDash(inv.emailed_at) }}</span>
                    </td>
                    <td style="text-align: center;">
                      <a :href="'/invoice/' + inv.invoice_number + '/pdf'" target="_blank" class="btn-download" title="Download PDF">📄 Download</a>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else style="font-size:12px; color:var(--muted); font-style:italic; margin-top:10px;">No linked invoices generated up the chain for this sale.</p>
            </div>
          </div>
        </div>

        <div v-if="dashTab === 'products'" class="products-section">
          <div class="stat-box" style="background:var(--paper2); border:1px solid var(--e8dec8); border-radius:8px; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <h3 style="margin:0; font-family:Georgia,serif; font-size:20px; color:var(--ink);">Product Catalog & Pricing</h3>
              <input type="text" v-model="adminProductSearch" placeholder="Search products..." style="width:250px; padding:8px 12px; border:1px solid var(--d8cbb0); border-radius:6px; background:#fff; color:var(--ink);">
            </div>
            <div style="overflow-x:auto;">
              <table class="stat-table" style="min-width:800px; width:100%;">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Cat</th>
                    <th>Wt</th>
                    <th>Route</th>
                    <th style="text-align:right">Sell</th>
                    <th style="text-align:right">SM</th>
                    <th style="text-align:right">Upper</th>
                    <th style="text-align:right">SFNF</th>
                    <th style="text-align:right">PPK</th>
                    <th style="text-align:right">MRP</th>
                    <th style="text-align:center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in filteredAdminProducts" :key="p.id">
                    <td style="font-weight:600;">{{ p.name }}</td>
                    <td>{{ p.cat }}</td>
                    <td>{{ p.wt ? p.wt + 'g' : '-' }}</td>
                    <td><span class="pill" :class="p.route">{{ p.route }}</span></td>
                    <td style="text-align:right">{{ p.sell ? formatINR(p.sell) : '-' }}</td>
                    <td style="text-align:right">{{ p.sm ? formatINR(p.sm) : '-' }}</td>
                    <td style="text-align:right">{{ p.upper ? formatINR(p.upper) : '-' }}</td>
                    <td style="text-align:right">{{ p.sfnf ? formatINR(p.sfnf) : '-' }}</td>
                    <td style="text-align:right">{{ p.ppk ? formatINR(p.ppk) : '-' }}</td>
                    <td style="text-align:right">{{ p.mrp ? formatINR(p.mrp) : '-' }}</td>
                    <td style="text-align:center">
                      <button @click="openEditProductModal(p)" class="btn-download" style="padding:4px 10px; cursor:pointer;">Edit</button>
                    </td>
                  </tr>
                  <tr v-if="filteredAdminProducts.length === 0">
                    <td colspan="11" style="text-align:center; padding:30px; color:var(--muted);">No products found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Product Modal -->
    <div v-if="editingProductData" class="modal-overlay" @click.self="closeEditProductModal">
      <div class="modal-content" style="max-width:500px; width:90%;">
        <h3 style="margin-top:0; font-family:Georgia,serif; border-bottom:1px solid var(--e8dec8); padding-bottom:10px;">Edit Product Prices</h3>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px; color:var(--ink);">{{ editingProductData.name }}</div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:20px;">{{ editingProductData.cat }} · {{ editingProductData.wt ? editingProductData.wt + 'g' : '' }} · Route: {{ editingProductData.route }}</div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">Sell Price (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.sell" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">SM Price (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.sm" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">Upper Price (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.upper" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">SFNF Price (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.sfnf" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">Price Per Kg (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.ppk" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
          <div>
            <label style="display:block; font-size:11px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:4px;">MRP (₹)</label>
            <input type="number" step="0.01" v-model="editingProductData.mrp" style="width:100%; box-sizing:border-box; background:#fff; color:var(--ink); border:1px solid var(--d8cbb0); padding:8px; border-radius:4px;">
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button @click="closeEditProductModal" class="btn-cancel">Cancel</button>
          <button @click="saveProductEdit" class="btn-verify" :disabled="savingProduct">
            {{ savingProduct ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
const productsList = ref([]);

const fetchProducts = async () => {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      productsList.value = await res.json();
    } else {
      console.error('Failed to fetch products');
    }
  } catch (err) {
    console.error('Error fetching products:', err);
  }
};

const dbGstRates = ref([]);
const fetchGstRates = async () => {
  try {
    const res = await fetch('/api/gst-rates');
    if (res.ok) {
      const data = await res.json();
      dbGstRates.value = data.rates;
    }
  } catch (err) {
    console.error('Error fetching gst rates:', err);
  }
};

const getGstRate = (from, to, defaultRate) => {
  const rateObj = dbGstRates.value.find(r => r.from_entity === from && r.to_entity === to);
  return rateObj ? Number(rateObj.gst_rate) : defaultRate;
};

const COMPANY = {
  SFNF: { name: 'Svar Fragrances & Flavors', short: 'SFNF' },
  SIPL: { name: 'Svar International Pvt Ltd', short: 'SIPL' },
  SADVIK: { name: 'Shree Sadvik Perfumery Works', short: 'Sadvik' },
  ALEITR: { name: 'Al Eitr', short: 'Al Eitr' },
  SM: { name: 'Sugandh Mart', short: 'SM' }
};

const INVOICES = computed(() => [
  { id: 'client', title: 'Bill → Client', from: 'SM', to: 'client', label: 'Customer Bill' },
  { id: 'sad_sm', title: 'Sadvik → SM', from: 'SADVIK', to: 'SM', filter: p => p.route === 'SADVIK', rate: 'sm', qty: 'unit', gst: getGstRate('SADVIK', 'SM', 0), hsn: '33074100' },
  { id: 'ale_sm', title: 'Al Eitr → SM', from: 'ALEITR', to: 'SM', filter: p => p.route === 'ALEITR', rate: 'sm', qty: 'unit', gst: getGstRate('ALEITR', 'SM', 18), hsn: '33030000' },
  { id: 'sipl_sad', title: 'SIPL → Sadvik', from: 'SIPL', to: 'SADVIK', filter: p => p.route === 'SADVIK', rate: 'upper', qty: 'unit', gst: getGstRate('SIPL', 'SADVIK', 5), hsn: '33074100' },
  { id: 'sipl_ale', title: 'SIPL → Al Eitr', from: 'SIPL', to: 'ALEITR', filter: p => p.route === 'ALEITR', rate: 'upper', qty: 'unit', gst: getGstRate('SIPL', 'ALEITR', 18), hsn: '33030000' },
  { id: 'sipl_sm', title: 'SIPL → SM (direct)', from: 'SIPL', to: 'SM', filter: p => p.route === 'DIRECT', rate: 'upper', qty: 'unit', gst: getGstRate('SIPL', 'SM', 18), hsn: '33074100' },
  { id: 'sfnf_sipl', title: 'SFNF → SIPL', from: 'SFNF', to: 'SIPL', filter: p => !!p.sfnf, rate: 'sfnf', qty: 'kg', gst: getGstRate('SFNF', 'SIPL', 18), hsn: '3302' }
]);

// Reactive state variables
const store = ref('SM1 — Thane');
const date = ref('');
const gstOn = ref(true);
const activeTab = ref('client');
const cart = ref([]); // Array of { id, qty }
const searchQuery = ref('');
const activeFilter = ref(null);
const activeRes = ref(-1);
const sending = ref(false);

const currentView = ref('home');
const showPasswordModal = ref(false);
const passwordInput = ref('');
const passwordError = ref('');
const dashTab = ref('sales');

const showShopkeeperModal = ref(false);
const shopkeeperPasswordInput = ref('');
const shopkeeperError = ref('');
const loggedShopkeeperStore = ref(null);
const shopkeeperTab = ref('counter');
const shopkeeperHistoryData = ref([]);
const shopkeeperHistoryLoading = ref(false);
const shopkeeperHistoryTab = ref('open');
const expandedSaleId = ref(null);

const shopkeeperOpenBills = computed(() => {
  return shopkeeperHistoryData.value.filter(s => s.status === 'open');
});

const shopkeeperClosedBills = computed(() => {
  return shopkeeperHistoryData.value.filter(s => s.status === 'closed');
});

const toggleShopkeeperItem = async (saleId, productName) => {
  try {
    const res = await fetch(`/api/shopkeeper/sales/${saleId}/toggle-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: productName })
    });
    const data = await res.json();
    if (data.success) {
      const sale = shopkeeperHistoryData.value.find(s => s.id === saleId);
      if (sale) {
        sale.checked_items = data.checked_items;
        sale.status = data.status;
      }
    }
  } catch (err) {
    console.error('Error toggling item:', err);
  }
};

const updateSaleStatus = async (saleId, status) => {
  try {
    const res = await fetch(`/api/shopkeeper/sales/${saleId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      const sale = shopkeeperHistoryData.value.find(s => s.id === saleId);
      if (sale) {
        sale.status = data.status;
        if (status === 'closed') {
          expandedSaleId.value = null; // optionally close the dropdown
        }
      }
    }
  } catch (err) {
    console.error('Error updating status:', err);
  }
};

const dashboardData = ref({ sales: [], metrics: {} });
const dashboardLoading = ref(false);
const dashboardError = ref(null);

const reportsList = ref([]);
const reportsLoading = ref(false);
const reportType = ref('daily');
const reportDate = ref(new Date().toISOString().split('T')[0]);
const reportMonth = ref(new Date().toISOString().slice(0, 7));

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};
const now = new Date();
const currentWeek = `${now.getFullYear()}-W${getWeekNumber(now).toString().padStart(2, '0')}`;
const reportWeek = ref(currentWeek);
const exportFormat = ref('pdf');

const generatingReport = ref(false);
const chartFilter = ref('30');
let chartInstance = null;

const statsData = ref(null);
const statsLoading = ref(false);
const statsError = ref(null);
const topProductsSort = ref('revenue');
const selectedRoute = ref(null);
let acceptanceChartInstance = null;

const adminProductSearch = ref('');
const editingProductData = ref(null);
const savingProduct = ref(false);

const filteredAdminProducts = computed(() => {
  const q = adminProductSearch.value.toLowerCase().trim();
  if (!q) return productsList.value;
  return productsList.value.filter(p => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) || p.route.toLowerCase().includes(q));
});

const openEditProductModal = (product) => {
  editingProductData.value = { ...product };
};

const closeEditProductModal = () => {
  editingProductData.value = null;
};

const saveProductEdit = async () => {
  if (!editingProductData.value) return;
  savingProduct.value = true;
  try {
    const res = await fetch(`/api/products/${editingProductData.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editingProductData.value)
    });
    
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update product');
    }
    
    // Refresh products list
    await fetchProducts();
    closeEditProductModal();
  } catch (err) {
    alert(err.message);
  } finally {
    savingProduct.value = false;
  }
};

const goToShopkeeper = async () => {
  try {
    const res = await fetch('/api/shopkeeper/me');
    const data = await res.json();
    if (data.success) {
      store.value = data.store;
      currentView.value = 'counter';
      return;
    }
  } catch (err) {
    console.error(err);
  }
  showShopkeeperModal.value = true;
};

const handleUnauthorized = () => {
  currentView.value = 'home';
  dashTab.value = 'sales';
  dashboardData.value = { sales: [], metrics: {} };
  statsData.value = null;
  showPasswordModal.value = true;
  passwordError.value = 'Session expired. Please verify password again.';
};

const goToAdmin = () => {
  showPasswordModal.value = true;
};

const closePasswordModal = () => {
  showPasswordModal.value = false;
  passwordInput.value = '';
  passwordError.value = '';
};

const closeShopkeeperModal = () => {
  showShopkeeperModal.value = false;
  shopkeeperPasswordInput.value = '';
  shopkeeperError.value = '';
};

const logout = async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error', err);
  }
  currentView.value = 'home';
  dashTab.value = 'sales';
  dashboardData.value = { sales: [], metrics: {} };
  statsData.value = null;
};

const logoutShopkeeper = async () => {
  try {
    await fetch('/api/shopkeeper-logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error', err);
  }
  currentView.value = 'home';
  loggedShopkeeperStore.value = null;
};

const verifyPassword = async () => {
  try {
    const res = await fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });
    const data = await res.json();
    if (data.success) {
      closePasswordModal();
      currentView.value = 'dashboard';
      fetchDashboard();
      fetchStats();
      fetchChartData();
      fetchAcceptanceTrend();
    } else {
      passwordError.value = data.error || 'Incorrect password';
    }
  } catch (err) {
    passwordError.value = 'Server error';
  }
};

const verifyShopkeeperPassword = async () => {
  try {
    const res = await fetch('/api/shopkeeper-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store: store.value, password: shopkeeperPasswordInput.value })
    });
    const data = await res.json();
    if (data.success) {
      closeShopkeeperModal();
      loggedShopkeeperStore.value = data.store;
      currentView.value = 'counter';
    } else {
      shopkeeperError.value = data.error || 'Incorrect password for selected store';
    }
  } catch (err) {
    shopkeeperError.value = 'Server error';
  }
};

const fetchShopkeeperHistory = async () => {
  shopkeeperHistoryLoading.value = true;
  try {
    const res = await fetch('/api/shopkeeper/history');
    if (res.status === 401) {
      currentView.value = 'home';
      loggedShopkeeperStore.value = null;
      return;
    }
    const data = await res.json();
    if (data.success) {
      shopkeeperHistoryData.value = data.history;
    }
  } catch (err) {
    console.error('Error fetching shopkeeper history', err);
  } finally {
    shopkeeperHistoryLoading.value = false;
  }
};

const fetchStats = async (silent = false) => {
  if (!silent) statsLoading.value = true;
  statsError.value = null;
  try {
    const routeParam = selectedRoute.value ? `&route=${selectedRoute.value}` : '';
    const res = await fetch(`/api/dashboard/stats?sort=${topProductsSort.value}${routeParam}`);
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch stats');
    statsData.value = await res.json();
  } catch (err) {
    statsError.value = err.message;
  } finally {
    if (!silent) statsLoading.value = false;
  }
};

const setTopProductsSort = (sort) => {
  topProductsSort.value = sort;
  fetchStats(true);
};

const fetchDashboard = async () => {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const res = await fetch('/api/dashboard');
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    const data = await res.json();
    dashboardData.value = data;
  } catch (err) {
    dashboardError.value = err.message;
  } finally {
    dashboardLoading.value = false;
  }
};

const fetchReports = async () => {
  reportsLoading.value = true;
  try {
    const res = await fetch('/api/reports');
    if(res.ok) reportsList.value = await res.json();
  } catch(e) {
    console.error(e);
  } finally {
    reportsLoading.value = false;
  }
};

const fetchChartData = async () => {
  try {
    const res = await fetch(`/api/dashboard/chart-data?days=${chartFilter.value}`);
    if (res.ok) {
      const data = await res.json();
      renderChart(data.dailySales);
    }
  } catch (e) {
    console.error(e);
  }
};

const fetchAcceptanceTrend = async () => {
  try {
    const routeParam = selectedRoute.value ? `?route=${selectedRoute.value}` : '';
    const res = await fetch(`/api/dashboard/acceptance-trend${routeParam}`);
    if (res.ok) {
      const data = await res.json();
      renderAcceptanceChart(data.weeklyTrend);
    }
  } catch (e) {
    console.error(e);
  }
};

const renderChart = (dailySales) => {
  nextTick(() => {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    if (chartInstance) {
      chartInstance.destroy();
    }
    
    const datasetsMap = {};
    const labelsSet = new Set();

    dailySales.forEach(d => {
      const date = d.date_val.split('T')[0];
      labelsSet.add(date);
      if (!datasetsMap[d.from_entity]) {
        datasetsMap[d.from_entity] = {};
      }
      datasetsMap[d.from_entity][date] = parseFloat(d.total);
    });

    const labels = Array.from(labelsSet).sort();
    const colors = ['#b8a884', '#9a5f12', '#3f7a4d', '#c8841f', '#8a7a60'];

    const datasets = Object.keys(datasetsMap).map((entity, idx) => {
      return {
        label: entity,
        data: labels.map(l => datasetsMap[entity][l] || 0),
        backgroundColor: colors[idx % colors.length],
        borderRadius: 4,
        hidden: selectedRoute.value && selectedRoute.value !== entity
      };
    });
    
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });
};

const renderAcceptanceChart = (weeklyTrend) => {
  nextTick(() => {
    const ctx = document.getElementById('acceptanceChart');
    if (!ctx) return;
    
    if (acceptanceChartInstance) acceptanceChartInstance.destroy();
    
    acceptanceChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyTrend.map(d => {
          const date = new Date(d.week_val);
          return 'W' + getWeekNumber(date) + ' ' + date.getFullYear();
        }),
        datasets: [{
          label: 'Acceptance Rate (%)',
          data: weeklyTrend.map(d => {
            const total = parseInt(d.total_invoices);
            const accepted = parseInt(d.accepted_invoices);
            return total > 0 ? ((accepted / total) * 100).toFixed(1) : 0;
          }),
          borderColor: '#3f7a4d',
          backgroundColor: 'rgba(63, 122, 77, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });
  });
};

const getDateOfWeek = (year, week) => {
  const d = new Date(year, 0, 1);
  const days = (week - 1) * 7;
  const dayOffset = (d.getDay() <= 4 ? 1 : 8) - d.getDay();
  d.setDate(d.getDate() + days + dayOffset);
  return d.toISOString().split('T')[0];
};

const getReportDateForBackend = () => {
  if (reportType.value === 'daily') return reportDate.value;
  if (reportType.value === 'monthly') return `${reportMonth.value}-01`;
  if (reportType.value === 'weekly') {
    if (!reportWeek.value) return reportDate.value;
    const [year, week] = reportWeek.value.split('-W');
    return getDateOfWeek(year, week);
  }
};

const toggleRoute = (route) => {
  if (selectedRoute.value === route) {
    selectedRoute.value = null;
  } else {
    selectedRoute.value = route;
  }
  fetchStats(true);
  fetchChartData();
  fetchAcceptanceTrend();
};

const getDeltaClass = (val) => {
  const v = parseFloat(val);
  if (v > 0) return 'up';
  if (v < 0) return 'down';
  return 'neutral';
};

const getDeltaText = (val, isPoint = false) => {
  const v = parseFloat(val);
  const symbol = v > 0 ? '↑' : (v < 0 ? '↓' : '');
  const unit = isPoint ? 'pts' : '%';
  return `${symbol} ${Math.abs(v)}${unit}`;
};

const handleExport = () => {
  if (exportFormat.value === 'pdf') {
    generateReport();
  } else if (exportFormat.value === 'csv') {
    exportCSV();
  } else if (exportFormat.value === 'xls') {
    exportExcel();
  }
};

const exportExcel = async () => {
  const dateToSend = getReportDateForBackend();
  if(!dateToSend) return;
  
  try {
    const res = await fetch(`/api/reports/export-excel?type=${reportType.value}&date=${dateToSend}`);
    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(errorData);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType.value}_${dateToSend}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Export Excel failed', err);
    alert('Failed to export Excel: ' + err.message);
  }
};

const downloadArchived = async (format, type, date) => {
  try {
    const res = await fetch(`/api/reports/export-${format === 'xls' ? 'excel' : 'csv'}?type=${type}&date=${date}`);
    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(errorData);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${type}_${date}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error(`Export ${format} failed`, err);
    alert(`Failed to export ${format}: ` + err.message);
  }
};

const exportCSV = async () => {
  const dateToSend = getReportDateForBackend();
  if(!dateToSend) return;
  
  try {
    const res = await fetch(`/api/reports/export-csv?type=${reportType.value}&date=${dateToSend}`);
    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(errorData);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType.value}_${dateToSend}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Export CSV failed', err);
    alert('Failed to export CSV: ' + err.message);
  }
};

const generateReport = async () => {
  const dateToSend = getReportDateForBackend();
  if(!dateToSend) return;
  generatingReport.value = true;
  try {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: reportType.value, date: dateToSend })
    });
    const data = await res.json();
    if(data.success) {
      window.open(data.report.file_path, '_blank');
      fetchReports();
    } else {
      alert(data.error || 'Failed to generate');
    }
  } catch(e) {
    console.error(e);
    alert('Error generating report');
  } finally {
    generatingReport.value = false;
  }
};

const formatDateDash = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });
};

// Initialize state from localStorage or defaults on mount
onMounted(() => {
  fetchProducts();
  fetchGstRates();
  const savedCart = localStorage.getItem('sugandh_mart_cart');
  if (savedCart) {
    try {
      cart.value = JSON.parse(savedCart);
    } catch (e) {
      console.error('Failed to parse saved cart:', e);
    }
  }

  const savedStore = localStorage.getItem('sugandh_mart_store');
  if (savedStore) store.value = savedStore;

  const savedGstOn = localStorage.getItem('sugandh_mart_gstOn');
  if (savedGstOn !== null) gstOn.value = JSON.parse(savedGstOn);

  const savedDate = localStorage.getItem('sugandh_mart_date');
  if (savedDate) {
    date.value = savedDate;
  } else {
    const d = new Date();
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    date.value = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }
  
  const savedView = localStorage.getItem('sugandh_mart_currentView');
  if (savedView) {
    currentView.value = savedView;
    if (savedView === 'dashboard') {
      fetchDashboard();
      fetchStats();
    }
  }
});

// Setup watches to persist state changes in localStorage
watch(currentView, (newView) => {
  localStorage.setItem('sugandh_mart_currentView', newView);
});

watch(cart, (newCart) => {
  localStorage.setItem('sugandh_mart_cart', JSON.stringify(newCart));
}, { deep: true });

watch(store, (newStore) => {
  localStorage.setItem('sugandh_mart_store', newStore);
});

watch(date, (newDate) => {
  localStorage.setItem('sugandh_mart_date', newDate);
});

watch(gstOn, (newGst) => {
  localStorage.setItem('sugandh_mart_gstOn', JSON.stringify(newGst));
});

// Helper formats
const formatINR = (n) => {
  return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatQty = (n) => {
  const num = Number(n);
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(3));
};

const getCompanyShort = (route) => {
  const code = route === 'ALEITR' ? 'ALEITR' : route === 'SADVIK' ? 'SADVIK' : 'SIPL';
  return COMPANY[code]?.short || route;
};

const getCompanyFull = (code) => {
  return COMPANY[code]?.name || code;
};

const getProduct = (id) => {
  return productsList.value.find(p => p.id === id) || {};
};

// Computations
const matches = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = productsList.value;
  if (activeFilter.value) {
    list = list.filter(p => p.route === activeFilter.value);
  }
  if (!q) return list;
  return list.filter(p => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));
});

const totalUnits = computed(() => {
  return cart.value.reduce((s, c) => s + c.qty, 0);
});

const linkedInvoicesCount = computed(() => {
  return INVOICES.value.filter(i => i.id !== 'client' && cart.value.some(c => i.filter(getProduct(c.id)))).length;
});

const fmtDate = computed(() => {
  if (!date.value) return '—';
  const [y, m, da] = date.value.split('-');
  return `${da}/${m}/${y}`;
});

const getInvoiceNo = (id) => {
  const d = (date.value || '').replace(/-/g, '').slice(2);
  const map = {
    client: 'SM',
    sad_sm: 'SSP',
    ale_sm: 'ALE',
    sipl_sad: 'SIP',
    sipl_ale: 'SIP',
    sipl_sm: 'SIP',
    sfnf_sipl: 'SFF'
  };
  return (map[id] || 'INV') + d;
};

// Calculate line items for custom invoices
const getLineRows = (inv) => {
  return cart.value.filter(c => inv.filter(getProduct(c.id))).map(c => {
    const p = getProduct(c.id);
    const rate = p[inv.rate] || 0;
    const qty = inv.qty === 'kg' ? (c.qty / (p.ppk || 120)) : c.qty;
    return { name: p.name, cat: p.cat, wt: p.wt, qty, rate, total: qty * rate, kg: inv.qty === 'kg' };
  });
};

const getTabCount = (inv) => {
  if (inv.id === 'client') return cart.value.length;
  return cart.value.filter(c => inv.filter(getProduct(c.id))).length;
};

// Client specific receipt calculations
const clientRows = computed(() => {
  return cart.value.map(c => {
    const p = getProduct(c.id);
    const rate = p.sm || p.sell || 0;
    return { name: p.name, cat: p.cat, wt: p.wt, qty: c.qty, rate, total: rate * c.qty, route: p.route };
  });
});

const clientSubtotal = computed(() => {
  return clientRows.value.reduce((s, r) => s + r.total, 0);
});

const clientGstRate = computed(() => {
  return gstOn.value ? 2.5 : 0;
});

const clientCgst = computed(() => {
  return clientSubtotal.value * clientGstRate.value / 100;
});

const clientSgst = computed(() => {
  return clientSubtotal.value * clientGstRate.value / 100;
});

const clientTotalGrand = computed(() => {
  return clientSubtotal.value + clientCgst.value + clientSgst.value;
});

const routeCount = (route) => {
  return cart.value.filter(c => getProduct(c.id).route === route).length;
};

// Active invoice (right pane tabs) details
const activeInvoiceDef = computed(() => {
  return INVOICES.value.find(i => i.id === activeTab.value);
});

const getActiveInvoiceTitlePrefix = computed(() => {
  return activeInvoiceDef.value?.title.split('→')[0].trim() || '';
});

const activeInvoiceRows = computed(() => {
  if (!activeInvoiceDef.value || activeInvoiceDef.value.id === 'client') return [];
  return getLineRows(activeInvoiceDef.value);
});

const activeInvoiceSubtotal = computed(() => {
  return activeInvoiceRows.value.reduce((s, r) => s + r.total, 0);
});

const activeInvoiceGstRate = computed(() => {
  if (!activeInvoiceDef.value) return 0;
  return gstOn.value ? activeInvoiceDef.value.gst : 0;
});

const activeInvoiceCgst = computed(() => {
  return activeInvoiceSubtotal.value * (activeInvoiceGstRate.value / 2) / 100;
});

const activeInvoiceSgst = computed(() => {
  return activeInvoiceSubtotal.value * (activeInvoiceGstRate.value / 2) / 100;
});

const activeInvoiceGrandTotal = computed(() => {
  return activeInvoiceSubtotal.value + activeInvoiceCgst.value + activeInvoiceSgst.value;
});

// Cart modifications
const addItem = (id) => {
  const ex = cart.value.find(c => c.id === id);
  if (ex) {
    ex.qty++;
  } else {
    cart.value.push({ id, qty: 1 });
  }
  searchQuery.value = '';
  activeRes.value = -1;
};

const setQty = (id, q) => {
  const c = cart.value.find(x => x.id === id);
  if (!c) return;
  if (q <= 0) {
    removeItem(id);
  } else {
    c.qty = q;
  }
};

const removeItem = (id) => {
  cart.value = cart.value.filter(c => c.id !== id);
};

// Search list index movements
const moveActiveRes = (dir) => {
  if (matches.value.length === 0) return;
  activeRes.value = (activeRes.value + dir + matches.value.length) % matches.value.length;
};

const addActiveRes = () => {
  if (activeRes.value >= 0 && activeRes.value < matches.value.length) {
    addItem(matches.value[activeRes.value].id);
  }
};

const printWindow = () => {
  window.print();
};

// Send invoices handler (POST to /bill)
const sendInvoices = async () => {
  sending.value = true;
  try {
    const invoicesToSend = [];
    INVOICES.value.forEach(inv => {
      if (inv.id === 'client') return;
      const invRows = getLineRows(inv);
      if (invRows.length > 0) {
        const sub = invRows.reduce((s, r) => s + r.total, 0);
        const rate = gstOn.value ? inv.gst : 0;
        const totalGstAmount = sub * (rate / 100);
        const grand = sub + totalGstAmount;
        
        if (grand > 0) {
          invoicesToSend.push({
            from_entity: inv.from,
            to_entity: inv.to,
            invoice_number: getInvoiceNo(inv.id),
            amount: sub,
            gst: totalGstAmount,
            grand_total: grand,
            hsn: inv.hsn,
            items: invRows
          });
        }
      }
    });

    const payload = {
      store: store.value,
      date: date.value,
      customer_total: clientTotalGrand.value,
      gst_on: gstOn.value,
      invoices: invoicesToSend
    };

    const response = await fetch('/bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit sale and generate invoices.');
    }

    alert('Invoices sent successfully!');
  } catch (err) {
    alert('Error sending invoices: ' + err.message);
  } finally {
    sending.value = false;
  }
};
</script>

<style scoped>
:root{
  --ink:#1a1410; --ink2:#2b2018; --paper:#f6f0e4; --paper2:#fffaf0;
  --amber:#c8841f; --amber-d:#9a5f12; --amber-l:#f0d9a8;
  --moss:#5a6b3b; --rose:#9c4a3c; --line:#d8cbb0; --line2:#e8dec8;
  --good:#3f7a4d; --muted:#8a7a60; --shadow:rgba(40,28,12,.14);
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

header{
  background:linear-gradient(180deg, #1a1410 0%, #2b2018 100%);
  color:#fffaf0; padding:14px 22px; display:flex; align-items:center;
  gap:18px; position:sticky; top:0; z-index:50; box-shadow:0 2px 12px rgba(40,28,12,.14);
}
.brand{display:flex;align-items:baseline;gap:10px}
.brand .mark{
  font-family:Georgia,serif; font-size:22px; font-weight:700; letter-spacing:.5px;
  color:#f0d9a8;
}
.brand .sub{font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#b8a884}
header .spacer{flex:1}
.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
.dashboard-link {
  color: #f0d9a8;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #c8841f;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}
.dashboard-link:hover {
  background: #c8841f;
  color: #1a1410;
}
.ctrl{display:flex;align-items:center;gap:8px}
.ctrl label{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#b8a884}

select,input[type=text],input[type=date]{
  font-family:inherit; font-size:13px; border:1px solid #44372a; background:#241a12;
  color:#fffaf0; padding:7px 10px; border-radius:7px; outline:none;
  appearance:none; -webkit-appearance:none;
}
select:focus,input:focus{border-color:#c8841f}
.toggle{display:inline-flex;border:1px solid #44372a;border-radius:7px;overflow:hidden}
.toggle button{
  background:#241a12;color:#b8a884;border:none;padding:7px 14px;font-family:inherit;
  font-size:12px;cursor:pointer;letter-spacing:.5px
}
.toggle button.on{background:#c8841f;color:#241a12;font-weight:700}

/* ---------- layout ---------- */
.wrap{display:grid;grid-template-columns:380px 1fr;gap:0;height:calc(100vh - 60px)}
@media(max-width:900px){.wrap{grid-template-columns:1fr;height:auto}}

/* ---------- left: entry ---------- */
.entry{background:#fffaf0;border-right:1px solid #d8cbb0;display:flex;flex-direction:column;min-height:0}
.entry-head{padding:16px 18px 10px}
.entry-head h2{font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1a1410}
.entry-head p{font-size:12px;color:#8a7a60;margin-top:2px}
.search-box{position:relative;padding:0 18px 12px}
.search-box input{
  width:100%;background:#fff;color:#1a1410;border:1px solid #d8cbb0;
  padding:11px 12px 11px 34px;font-size:14px;border-radius:9px
}
.search-box .ico{position:absolute;left:30px;top:11px;color:#9a5f12;font-size:15px}
.results{margin-top:10px;background:#fff;border:1px solid #d8cbb0;
  border-radius:10px;max-height:280px;overflow:auto;display:none}
.results.show{display:block}
.res-item{padding:9px 12px;cursor:pointer;border-bottom:1px solid #e8dec8;display:flex;justify-content:space-between;gap:8px;align-items:center}
.res-item:last-child{border-bottom:none}
.res-item:hover,.res-item.active{background:#f6f0e4}
.res-item .nm{font-weight:600;font-size:13px}
.res-item .meta{font-size:11px;color:#8a7a60}

.pill{font-size:9px;letter-spacing:.5px;padding:2px 6px;border-radius:20px;text-transform:uppercase;font-weight:700;white-space:nowrap}
.pill.SADVIK{background:#ece3cf;color:#7a5a14}
.pill.ALEITR{background:#efd9d3;color:#8a3a2c}
.pill.DIRECT{background:#dde6cf;color:#46591f}
.pill.SIPL{background:#dde6cf;color:#46591f}

/* cart */
.cart{flex:1;overflow:auto;padding:4px 18px 18px}
.cart-empty{text-align:center;color:#8a7a60;padding:48px 20px;font-size:13px}
.cart-empty .big{font-family:Georgia,serif;font-size:40px;color:#d8cbb0;margin-bottom:8px}
.ci{background:#fff;border:1px solid #d8cbb0;border-radius:11px;padding:11px 12px;margin-top:10px;position:relative}
.ci .top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ci .nm{font-weight:700;font-size:13px;line-height:1.25;color: #1a1410;}
.ci .meta{font-size:11px;color:#8a7a60;margin-top:2px}
.ci .rm{background:none;border:none;color:#9c4a3c;cursor:pointer;font-size:16px;line-height:1;padding:0 2px}
.ci .qtyrow{display:flex;align-items:center;gap:10px;margin-top:9px}
.qstep{display:inline-flex;align-items:center;border:1px solid #d8cbb0;border-radius:8px;overflow:hidden}
.qstep button{width:30px;height:30px;border:none;background:#f6f0e4;color:#1a1410;font-size:16px;cursor:pointer}
.qstep button:hover{background:#f0d9a8}
.qstep input{width:52px;text-align:center;border:none;border-left:1px solid #d8cbb0;border-right:1px solid #d8cbb0;
  background:#fff;color:#1a1410;height:30px;font-size:14px;font-weight:600;border-radius:0}
.ci .lt{margin-left:auto;font-family:Georgia,serif;font-weight:700;font-size:15px;color: #1a1410;}
.ci .lt small{font-size:10px;color:#8a7a60;font-weight:400;display:block;text-align:right;font-family:Inter}

.send-btn {
  display: block;
  width: 100%;
  background: #3f7a4d;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 9px;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  margin-top: 15px;
  text-align: center;
  transition: background 0.2s;
}
.send-btn:hover {
  background: #315e3b;
}
.send-btn:disabled {
  background: #8a7a60;
  cursor: not-allowed;
}

/* ---------- right: invoices ---------- */
.stage{display:flex;flex-direction:column;min-height:0;background:#f6f0e4}
.tabs{display:flex;gap:2px;padding:12px 18px 0;overflow-x:auto;border-bottom:1px solid #d8cbb0}
.tab{
  background:transparent;border:1px solid transparent;border-bottom:none;padding:9px 14px;cursor:pointer;
  font-family:inherit;font-size:12px;font-weight:600;color:#8a7a60;white-space:nowrap;border-radius:9px 9px 0 0;
  display:flex;align-items:center;gap:7px
}
.tab .dot{width:7px;height:7px;border-radius:50%;background:#d8cbb0}
.tab.has .dot{background:#3f7a4d}
.tab.active{background:#fffaf0;color:#1a1410;border-color:#d8cbb0}
.tab .cnt{background:#1a1410;color:#fffaf0;font-size:10px;padding:1px 6px;border-radius:20px;font-weight:700}
.tab.active .cnt{background:#c8841f;color:#241a12}
.invoice-scroll{flex:1;overflow:auto;padding:22px}

/* invoice paper */
.inv{background:#fffaf0;max-width:760px;margin:0 auto;border:1px solid #d8cbb0;
  box-shadow:0 8px 28px rgba(40,28,12,.14);border-radius:4px;overflow:hidden}
.inv-band{background:#1a1410;color:#fffaf0;padding:16px 22px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px}
.inv-band .from{font-family:Georgia,serif;font-size:18px;font-weight:700;color:#f0d9a8}
.inv-band .arrow{font-size:11px;letter-spacing:1px;color:#b8a884;text-transform:uppercase;margin-top:3px}
.inv-band .to{font-size:13px;font-weight:600;margin-top:2px}
.inv-band .rt{text-align:right;font-size:11px;color:#cdbf9f;line-height:1.7}
.inv-band .rt b{color:#fffaf0}
.inv-meta{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid #d8cbb0}
.inv-meta div{flex:1;min-width:120px;padding:9px 14px;border-right:1px solid #e8dec8;font-size:11px;color:#8a7a60}
.inv-meta div:last-child{border-right:none}
.inv-meta div b{display:block;color:#1a1410;font-size:12px;margin-top:2px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead th{background:#efe6d2;font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:#7a6843;
  text-align:left;padding:9px 14px;border-bottom:1px solid #d8cbb0}
thead th.r{text-align:right}
tbody td{padding:9px 14px;border-bottom:1px solid #e8dec8;font-size:13px;color: #1a1410;}
tbody td.r{text-align:right;font-variant-numeric:tabular-nums}
tbody tr:last-child td{border-bottom:none}
.desc{font-weight:600}
.desc small{display:block;color:#8a7a60;font-weight:400;font-size:11px}
.inv-foot{padding:14px 14px 18px;display:flex;justify-content:flex-end}
.totals{width:300px;font-size:13px}
.totals .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #d8cbb0;color: #1a1410;}
.totals .row.grand{border-bottom:none;border-top:2px solid #1a1410;margin-top:4px;padding-top:10px;
  font-family:Georgia,serif;font-size:18px;font-weight:700}
.totals .row .lbl{color:#8a7a60}
.totals .row.grand .lbl{color:#1a1410}
.empty-inv{text-align:center;color:#8a7a60;padding:60px 20px}
.empty-inv .big{font-family:Georgia,serif;font-size:34px;color:#d8cbb0}

/* summary chips on bill-to-client tab */
.summary{max-width:760px;margin:0 auto}
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:18px}
.scard{background:#fffaf0;border:1px solid #d8cbb0;border-radius:11px;padding:14px}
.scard .k{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a7a60}
.scard .v{font-family:Georgia,serif;font-size:23px;font-weight:700;margin-top:4px}
.scard.accent{background:#1a1410;color:#fffaf0}
.scard.accent .v{color:#f0d9a8}
.printbtn{background:#c8841f;color:#241a12;border:none;padding:9px 16px;border-radius:8px;font-family:inherit;
  font-weight:700;font-size:13px;cursor:pointer;letter-spacing:.3px}
.printbtn:hover{background:#9a5f12;color:#fff}
.flowline{font-size:11px;color:#8a7a60;text-align:center;margin:16px auto 0;max-width:760px;letter-spacing:.3px}

@media print{
  header, .entry, .tabs, .printbtn { display:none !important }
  .wrap { display:block; height:auto }
  .invoice-scroll { padding:0; overflow:visible }
  .inv { box-shadow:none; border:1px solid #999; max-width:100% }
}

/* Dashboard specific styles */
.dashboard-wrap {
  flex: 1;
  overflow: auto;
  padding: 40px 20px;
  background: var(--paper);
}
.container { max-width: 1100px; margin: 0 auto; }
.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px; }
.metric-card { background: var(--paper2); border: 1px solid var(--line); border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.01); }
.metric-card .title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); font-weight: 700; }
.metric-card .value { font-family: Georgia, serif; font-size: 28px; font-weight: 700; color: var(--ink); margin-top: 6px; }

.sale-card { background: var(--paper2); border: 1px solid var(--line); border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
.sale-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--line2); padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.sale-title { font-family: Georgia, serif; font-size: 18px; font-weight: 700; color: var(--ink); }
.sale-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
.sale-total { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: var(--good); text-align: right; }
.sale-total small { font-family: "Inter", sans-serif; font-size: 10px; color: var(--muted); font-weight: 400; display: block; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

.badge { display: inline-block; padding: 4px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
.badge.pending { background: #fdf3e2; color: #b7791f; border: 1px solid #fbd38d; }
.badge.accepted { background: #e6fffa; color: #234e52; border: 1px solid #b2f5ea; }
.badge.rejected { background: #fff5f5; color: #9b2c2c; border: 1px solid #feb2b2; }
.timestamp { font-size: 10px; color: var(--muted); display: block; margin-top: 4px; }

.btn-download { display: inline-block; background: #f6f0e4; color: #1a1410; border: 1px solid #d8cbb0; padding: 6px 10px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 600; transition: all 0.2s; }
.btn-download:hover:not(.disabled) { background: #e8dec8; border-color: #c8841f; }
.btn-download.disabled { opacity: 0.5; cursor: not-allowed; background: transparent; border: none; }

/* Premium Home Styles */
.home-view {
  display: flex; justify-content: center; align-items: center; 
  height: calc(100vh - 60px); 
  background: radial-gradient(circle at 50% 0%, var(--paper2) 0%, var(--paper) 100%);
}
.home-container {
  max-width: 840px;
  width: 100%;
  padding: 0 20px;
  text-align: center;
}
.home-brand {
  margin-bottom: 54px;
}
.home-brand h1 {
  font-family: Georgia, serif;
  font-size: 46px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}
.home-brand p {
  color: var(--muted);
  font-size: 15px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
}
.portal-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
.portal-card {
  background: var(--paper2);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 44px 34px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 15px rgba(40,28,12,0.05);
  position: relative;
  overflow: hidden;
}
.portal-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--good);
  opacity: 0.8;
  transition: all 0.3s;
}
.portal-card.admin::before {
  background: var(--amber);
}
.portal-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(40,28,12,0.12);
  border-color: #c8841f; /* Amber border on hover */
}
.portal-card.shopkeeper:hover {
  border-color: #3f7a4d; /* Green border on hover */
}
.portal-card:hover::before {
  height: 6px;
  opacity: 1;
}
.portal-icon {
  font-size: 44px;
  margin-bottom: 24px;
}
.portal-card h3 {
  font-family: Georgia, serif;
  font-size: 24px;
  color: var(--ink);
  margin-bottom: 14px;
  font-weight: 700;
}
.portal-card p {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
}
.portal-arrow {
  color: var(--good);
  font-weight: 700;
  font-size: 24px;
  transition: transform 0.2s;
  display: inline-block;
}
.portal-card.admin .portal-arrow {
  color: var(--amber-d);
}
.portal-card:hover .portal-arrow {
  transform: translateX(10px);
}

@media (max-width: 600px) {
  .portal-cards { grid-template-columns: 1fr; }
}

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 8, 5, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 100; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-content { background: rgba(255, 250, 240, 0.85); padding: 40px 30px; border-radius: 24px; width: 100%; max-width: 380px; text-align: center; border: 1px solid rgba(216, 203, 176, 0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transform: translateY(0); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-content h3 { margin-bottom: 8px; font-family: Georgia, serif; font-size: 26px; color: var(--ink); font-weight: 700; }
.modal-content p { font-size: 14px; color: var(--muted); margin-bottom: 28px; line-height: 1.5; }
.modal-content input { width: 100%; padding: 16px; font-size: 16px; border: 1px solid rgba(216, 203, 176, 0.8); background: rgba(255,255,255,0.7); border-radius: 12px; text-align: center; margin-bottom: 12px; letter-spacing: 1px; transition: all 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
.modal-content input:focus { outline: none; border-color: var(--amber); background: #fff; box-shadow: 0 0 0 3px rgba(200, 132, 31, 0.2); }
.error-text { color: var(--rose); font-size: 13px; margin-bottom: 16px; font-weight: 600; animation: shake 0.4s; }
@keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-5px);} 75% {transform: translateX(5px);} }
.modal-actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel, .btn-verify { flex: 1; padding: 14px; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; }
.btn-cancel { background: rgba(232, 222, 200, 0.7); color: var(--ink); }
.btn-cancel:hover { background: rgba(216, 203, 176, 0.9); transform: translateY(-1px); }
.btn-verify { background: linear-gradient(135deg, var(--amber) 0%, var(--amber-d) 100%); color: #fff; box-shadow: 0 4px 12px rgba(200, 132, 31, 0.3); }
.btn-verify:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(200, 132, 31, 0.4); filter: brightness(1.1); }
.btn-verify:active { transform: translateY(0); }

.dash-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
.dash-tabs button { background: transparent; border: 1px solid transparent; padding: 8px 16px; font-size: 14px; font-weight: 600; color: var(--muted); cursor: pointer; border-radius: 6px; }
.dash-tabs button:hover { background: #e8dec8; }
.dash-tabs button.active { background: var(--amber); color: #fff; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
.stat-box { background: #fff; border: 1px solid var(--line2); border-radius: 12px; padding: 24px; box-shadow: 0 4px 24px rgba(40,28,12,0.04); }
.stat-box h3 { margin-bottom: 20px; font-family: Georgia, serif; font-size: 18px; color: var(--ink); }
.stat-table { width: 100%; border-collapse: collapse; }
.stat-table th, .stat-table td { padding: 12px 12px; border-bottom: 1px solid var(--line2); font-size: 13px; }
.stat-table th { background: transparent; color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid var(--line); letter-spacing: 0.5px; }
.stat-table tbody tr:last-child td { border-bottom: none; }
.delta { font-size: 11px; margin-top: 8px; font-weight: 600; }
.delta.up { color: var(--good); }
.delta.down { color: var(--rose); }
.delta.neutral { color: var(--muted); }
.selected-row { background-color: var(--paper); }
.toggle-sm { display:inline-flex; border:1px solid #d8cbb0; border-radius:4px; overflow:hidden; background:#fff; }
.toggle-sm button { background:#fff; color:#8a7a60; border:none; padding:4px 10px; font-size:11px; cursor:pointer; font-weight:700; text-transform:uppercase; transition:all 0.2s; outline:none; }
.toggle-sm button.on { background:#c8841f; color:#fff; }
</style>
