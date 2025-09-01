import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestServicesSimple() {
  const handleTest = () => {
    console.log('Test button clicked');
    alert('Test page is working!');
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Simple Test Page</h1>
            <p className="text-muted-foreground">Testing if the page loads correctly</p>
          </div>
          
          <Button onClick={handleTest} size="lg">
            Test Button
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p>If you can see this page, the routing is working correctly!</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}