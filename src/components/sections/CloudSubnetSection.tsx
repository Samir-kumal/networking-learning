"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingMetric from "@/components/networking/NetworkingMetric";
import { useState } from "react";

export default function CloudSubnetSection() {
  const [activeCloud, setActiveCloud] = useState<"aws" | "azure" | "gcp">("aws");
  const [checkedTips, setCheckedTips] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
  });

  const toggleTip = (idx: number) => {
    setCheckedTips((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const cloudProviders = {
    aws: {
      name: "AWS VPC (Virtual Private Cloud)",
      color: "border-[#ff9900]/50 text-[#ff9900]",
      badgeBg: "bg-[#ff9900]/10 text-[#ff9900] border-[#ff9900]/30",
      scope: "Each IPv4 subnet is associated with exactly one Availability Zone (AZ). A VPC spans the Region.",
      reservedIps: "AWS reserves 5 IPv4 addresses per subnet: .0 network, .1 VPC router, .2 AWS DNS, .3 future use, and the last address (.255 in a /24).",
      codeSnippet: `# AWS VPC & Subnet Terraform Example
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public_az1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}`,
    },
    azure: {
      name: "Azure VNet (Virtual Network)",
      color: "border-[#0089d6]/50 text-[#0089d6]",
      badgeBg: "bg-[#0089d6]/10 text-[#0089d6] border-[#0089d6]/30",
      scope: "A VNet is regional; its subnets can host resources in supported Availability Zones.",
      reservedIps: "Azure reserves the first four and last IPv4 address in each subnet: .0 network, .1 default gateway, .2 and .3 Azure DNS, and the last address.",
      codeSnippet: `# Azure VNet & Gateway Subnet Example
resource "azurerm_virtual_network" "vnet" {
  name          = "enterprise-vnet"
  address_space = ["172.16.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.1.0/24"]
}`,
    },
    gcp: {
      name: "GCP VPC (Google Cloud Platform)",
      color: "border-[#4285f4]/50 text-[#4285f4]",
      badgeBg: "bg-[#4285f4]/10 text-[#4285f4] border-[#4285f4]/30",
      scope: "A VPC network is global; each subnet is regional and can span that region's zones.",
      reservedIps: "Google Cloud reserves 4 IPv4 addresses per subnet: first (network), second (default gateway), second-to-last, and last address.",
      codeSnippet: `# GCP Custom Mode VPC Subnet Example
resource "google_compute_network" "custom_vpc" {
  name                    = "global-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "us_central_subnet" {
  name          = "us-central1-subnet"
  ip_cidr_range = "10.2.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.custom_vpc.id
}`,
    },
  };

  const tips = [
    {
      title: "Plan for growth and non-overlap",
      desc: "Choose an address range that leaves room for growth and does not overlap networks you must connect over VPN or Direct Connect. The required size depends on the design; /16 is not a universal default.",
    },
    {
      title: "Treat public/private as a routing design",
      desc: "A common pattern places internet-facing resources in public subnets and application or database workloads in private subnets. Route tables, gateways, load balancers, and policy determine the actual exposure.",
    },
    {
      title: "Check provider address reservations",
      desc: "Account for each provider's reservations when sizing IPv4 subnets. For example, AWS and Azure reserve five addresses in each subnet; in a /28, that leaves 11 addresses available for provider resources. Minimum prefix lengths and other limits vary by provider.",
    },
    {
      title: "Design for the availability model",
      desc: "Use separate subnets in multiple zones when the workload and provider support zone redundancy; the number of zones is an availability decision, not a universal requirement.",
    },
    {
      title: "Verify the platform's controls",
      desc: "Use the controls provided by the platform: security groups are commonly stateful, while network ACLs are commonly stateless and evaluated at a subnet boundary. Verify the provider's rule direction and default behavior before relying on a policy.",
    },
  ];

  const currentCloud = cloudProviders[activeCloud];

  return (
    <section
      id="cloud"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#cloud"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◉</span>}
        title={<>12. Subnets in the Cloud</>}
        description={<>Cloud hyperscalers (AWS, Azure, GCP) use Software-Defined Networking (SDN) to deliver virtual private clouds. While cloud subnets share traditional CIDR math, cloud vendors enforce vendor-specific IP reservations, availability zone scopes, and routing rules.</>}
      />
      <div className="module-content networking-module-content">

      {/* Cloud Provider Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveCloud("aws")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "aws"
              ? "bg-[#ff9900]/10 text-[#ff9900] border-[#ff9900]/50 font-bold"
              : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
          }`}
        >
          <span>☁️</span> AWS VPC
        </button>
        <button
          onClick={() => setActiveCloud("azure")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "azure"
              ? "bg-[#0089d6]/10 text-[#0089d6] border-[#0089d6]/50 font-bold"
              : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
          }`}
        >
          <span>🔷</span> Azure VNet
        </button>
        <button
          onClick={() => setActiveCloud("gcp")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "gcp"
              ? "bg-[#4285f4]/10 text-[#4285f4] border-[#4285f4]/50 font-bold"
              : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
          }`}
        >
          <span>🌐</span> GCP VPC
        </button>
      </div>

      <NetworkingPanel className="mb-10">
      {/* Selected Provider Card */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentCloud.name}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-mono border ${currentCloud.badgeBg}`}>
            Cloud SDN Subnet Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <NetworkingMetric label="Subnet Scope & Availability" value={activeCloud.toUpperCase()} detail={currentCloud.scope} tone="cyan" />
          <NetworkingMetric label="Reserved Addresses" value="Provider-specific" detail={currentCloud.reservedIps} tone="amber" />
        </div>

        {/* Code Snippet */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Infrastructure-as-Code Configuration (Terraform)</span>
          <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
            {currentCloud.codeSnippet}
          </pre>
        </div>
      </div>
      </NetworkingPanel>

      {/* Cloud Subnetting Tips Checklist */}
      <NetworkingPanel>
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span>📋</span> Cloud Subnetting Architecture Checklist & Tips
        </h3>

        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              onClick={() => toggleTip(idx)}
              className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${
                checkedTips[idx]
                  ? "bg-slate-50 dark:bg-slate-700 border-emerald-400/40 text-slate-900 dark:text-slate-100"
                  : "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedTips[idx]}
                aria-label={`Mark ${tip.title} as complete`}
                onChange={() => toggleTip(idx)}
                className="mt-1 rounded border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:ring-0 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <div>
                <h4 className={`text-sm font-semibold mb-1 ${checkedTips[idx] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {tip.title}
                </h4>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </NetworkingPanel>
      </div>
    </section>
  );
}
