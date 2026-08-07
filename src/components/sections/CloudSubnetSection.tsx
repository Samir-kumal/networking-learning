"use client";

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
      scope: "Subnets are strictly bound to a single Availability Zone (AZ).",
      reservedIps: "5 Reserved IPs per subnet (.0 network, .1 VPC router, .2 AWS DNS, .3 reserved, .255 broadcast).",
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
      scope: "VNets span an entire Azure Region; subnets can span Availability Zones.",
      reservedIps: "5 Reserved IPs per subnet (.0 network, .1 default gateway, .2 & .3 Azure DNS, .255 broadcast).",
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
      scope: "VPCs are Global resources; subnets are Regional resources.",
      reservedIps: "4 Reserved IPs per subnet (.0 network, .1 gateway, .2 second-to-last reserved, .255 broadcast).",
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
      title: "Plan for Future Scale & Non-overlapping Address Space",
      desc: "Always select large VPC CIDR blocks (/16) even when starting small. Never overlap VPC ranges with on-premise IP networks (10.x.x.x or 172.16.x.x) to enable seamless VPN/DirectConnect hybrid routing.",
    },
    {
      title: "Enforce Strict Public vs. Private Subnet Separation",
      desc: "Place internet-facing load balancers in Public Subnets (attached to Internet Gateways) and application/database workloads in Private Subnets (routed via NAT Gateways for outbound access only).",
    },
    {
      title: "Account for Cloud IP Reservations in Sizing Calculations",
      desc: "Remember AWS and Azure reserve 5 IP addresses per subnet (.0, .1, .2, .3, .255). A small /29 subnet provides only 3 usable host IPs instead of 6.",
    },
    {
      title: "Deploy Multi-AZ Redundancy Across Availability Zones",
      desc: "Provision identical subnets across at least 2 or 3 Availability Zones (e.g. us-east-1a, us-east-1b) to ensure multi-AZ fault tolerance for enterprise workloads.",
    },
    {
      title: "Isolate High-Security Subnets with Network ACLs (NACLs)",
      desc: "Combine Cloud Security Groups (stateful) with Network ACLs (stateless at the subnet boundary) to enforce explicit packet filtering between database and web subnets.",
    },
  ];

  const currentCloud = cloudProviders[activeCloud];

  return (
    <section
      id="cloud"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #cloud
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          11. Subnets in the Cloud
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        Cloud hyperscalers (AWS, Azure, GCP) use Software-Defined Networking (SDN) to deliver virtual private clouds. While cloud subnets share traditional CIDR math, cloud vendors enforce vendor-specific IP reservations, availability zone scopes, and routing rules.
      </p>

      {/* Cloud Provider Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveCloud("aws")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "aws"
              ? "bg-[#ff9900]/10 text-[#ff9900] border-[#ff9900]/50 font-bold"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900"
          }`}
        >
          <span>☁️</span> AWS VPC
        </button>
        <button
          onClick={() => setActiveCloud("azure")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "azure"
              ? "bg-[#0089d6]/10 text-[#0089d6] border-[#0089d6]/50 font-bold"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900"
          }`}
        >
          <span>🔷</span> Azure VNet
        </button>
        <button
          onClick={() => setActiveCloud("gcp")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
            activeCloud === "gcp"
              ? "bg-[#4285f4]/10 text-[#4285f4] border-[#4285f4]/50 font-bold"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900"
          }`}
        >
          <span>🌐</span> GCP VPC
        </button>
      </div>

      {/* Selected Provider Card */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold text-slate-900">{currentCloud.name}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-mono border ${currentCloud.badgeBg}`}>
            Cloud SDN Subnet Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <span className="text-xs font-mono text-indigo-600 block mb-1">Subnet Scope & Availability</span>
            <p className="text-sm text-slate-900">{currentCloud.scope}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <span className="text-xs font-mono text-amber-600 block mb-1">Reserved Addresses</span>
            <p className="text-sm text-slate-900">{currentCloud.reservedIps}</p>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-500">Infrastructure-as-Code Configuration (Terraform)</span>
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-900 overflow-x-auto leading-relaxed">
            {currentCloud.codeSnippet}
          </pre>
        </div>
      </div>

      {/* Cloud Subnetting Tips Checklist */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>📋</span> Cloud Subnetting Architecture Checklist & Tips
        </h3>

        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              onClick={() => toggleTip(idx)}
              className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${
                checkedTips[idx]
                  ? "bg-slate-50 border-emerald-400/40 text-slate-900"
                  : "bg-slate-50/50 border-slate-200 text-slate-500 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedTips[idx]}
                onChange={() => toggleTip(idx)}
                className="mt-1 rounded border-slate-200 text-emerald-600 focus:ring-0 bg-white cursor-pointer"
              />
              <div>
                <h4 className={`text-sm font-semibold mb-1 ${checkedTips[idx] ? "text-emerald-600" : "text-slate-900"}`}>
                  {tip.title}
                </h4>
                <p className="text-xs leading-relaxed text-slate-500">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
