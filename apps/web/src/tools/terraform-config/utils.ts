import type { TerraformConfigOptions } from './schema'

const PROVIDER_BLOCK: Record<string, string> = {
  aws: [
    'terraform {',
    '  required_providers {',
    '    aws = { source = "hashicorp/aws", version = "~> 5.0" }',
    '  }',
    '}',
    'provider "aws" {',
    '  region = var.region',
    '}',
  ].join('\n'),
  azure: [
    'terraform {',
    '  required_providers {',
    '    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }',
    '  }',
    '}',
    'provider "azurerm" {',
    '  features {}',
    '}',
  ].join('\n'),
  google: [
    'terraform {',
    '  required_providers {',
    '    google = { source = "hashicorp/google", version = "~> 5.0" }',
    '  }',
    '}',
    'provider "google" {',
    '  project = var.project',
    '  region  = var.region',
    '}',
  ].join('\n'),
}

type Snippet = { resource: string; output: string }

function snippet(provider: string, resource: string): Snippet {
  if (resource === 'compute') {
    if (provider === 'aws')
      return {
        resource: [
          'resource "aws_instance" "app" {',
          '  ami           = "ami-0c55b159cbfafe1f0"',
          '  instance_type = "t3.micro"',
          '}',
        ].join('\n'),
        output: 'output "instance_ip" { value = aws_instance.app.public_ip }',
      }
    if (provider === 'azure')
      return {
        resource: [
          'resource "azurerm_linux_virtual_machine" "app" {',
          '  name                = "app-vm"',
          '  resource_group_name = "rg-app"',
          '  location            = "eastus"',
          '  size                = "Standard_B2s"',
          '}',
        ].join('\n'),
        output: 'output "vm_id" { value = azurerm_linux_virtual_machine.app.id }',
      }
    return {
      resource: [
        'resource "google_compute_instance" "app" {',
        '  name         = "app-vm"',
        '  machine_type = "e2-micro"',
        '  zone         = "us-central1-a"',
        '}',
      ].join('\n'),
      output: 'output "vm_self_link" { value = google_compute_instance.app.self_link }',
    }
  }
  if (resource === 'storage') {
    if (provider === 'aws')
      return {
        resource: ['resource "aws_s3_bucket" "data" {', '  bucket = "toolbox-data"', '}'].join(
          '\n',
        ),
        output: 'output "bucket_domain" { value = aws_s3_bucket.data.bucket_domain_name }',
      }
    if (provider === 'azure')
      return {
        resource: [
          'resource "azurerm_resource_group" "main" {',
          '  name     = "rg-main"',
          '  location = "eastus"',
          '}',
        ].join('\n'),
        output: 'output "rg_id" { value = azurerm_resource_group.main.id }',
      }
    return {
      resource: [
        'resource "google_storage_bucket" "data" {',
        '  name     = "toolbox-data"',
        '  location = "US"',
        '}',
      ].join('\n'),
      output: 'output "bucket_url" { value = google_storage_bucket.data.url }',
    }
  }
  // network
  if (provider === 'aws')
    return {
      resource: ['resource "aws_vpc" "main" {', '  cidr_block = "10.0.0.0/16"', '}'].join('\n'),
      output: 'output "vpc_id" { value = aws_vpc.main.id }',
    }
  if (provider === 'azure')
    return {
      resource: [
        'resource "azurerm_virtual_network" "main" {',
        '  name                = "vnet-main"',
        '  resource_group_name = "rg-app"',
        '  location            = "eastus"',
        '  address_space       = ["10.0.0.0/16"]',
        '}',
      ].join('\n'),
      output: 'output "vnet_id" { value = azurerm_virtual_network.main.id }',
    }
  return {
    resource: [
      'resource "google_compute_network" "main" {',
      '  name                    = "vnet-main"',
      '  auto_create_subnetworks = true',
      '}',
    ].join('\n'),
    output: 'output "network_id" { value = google_compute_network.main.id }',
  }
}

export function transform(input: { text: string }, options: TerraformConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const sn = snippet(options.provider, options.resource)
  const vars =
    options.provider === 'google'
      ? [
          'variable "project" { type = string }',
          'variable "region" { type = string, default = "us-central1" }',
        ].join('\n')
      : ['variable "region" { type = string, default = "us-east-1" }'].join('\n')

  return [
    '# ---- main.tf ----',
    PROVIDER_BLOCK[options.provider] ?? '',
    sn.resource,
    '',
    '# ---- variables.tf ----',
    vars,
    '',
    '# ---- outputs.tf ----',
    sn.output,
  ].join('\n')
}
