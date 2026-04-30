-- =====================================================================
-- Deluxe Car Club rebrand — strip "DSC" labels from seeded data.
-- Idempotent: safe to re-run.
-- =====================================================================

update rewards set name = 'DCC Sticker Pack'
  where name = 'DSC Sticker Pack';

update rewards set
    name = 'Branded T-Shirt',
    description = 'Heavyweight DCC tee, ivory wordmark on matte black.'
  where name = 'Branded T-Shirt'
    and description like '%DSC%';

update rewards set
    name = 'Hat or Hoodie',
    description = 'Choose a stamped DCC hat or premium hoodie.'
  where name = 'Hat or Hoodie'
    and description like '%DSC%';

update rewards set
    description = 'Get your build featured across DCC channels for a month.'
  where name = 'Featured Build of the Month'
    and description like '%DSC%';
