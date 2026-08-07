import type { Metadata } from "next";
import AwsSection from "@/components/tracks/AwsSection";

export const metadata: Metadata = {
  title: "AWS Cloud Architecture & Security — SubnetLab",
  description:
    "Master AWS VPC subnetting, CIDR planning, IAM JSON policy evaluation, S3 security & default encryption, EC2 vs ECS vs EKS compute selection, and Lambda Serverless CDN flows.",
};

export default function AwsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      <AwsSection />
    </div>
  );
}
